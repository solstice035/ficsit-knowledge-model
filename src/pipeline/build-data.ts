/**
 * Builds trimmed, typed game data for the app from the raw sources.
 *
 * Usage:
 *   npm run data:build                       # uses data/raw/docs-en.json
 *   npm run data:build -- --docs <en-US.json> # uses your own game install's Docs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Building,
  Collectible,
  CollectibleType,
  DataMeta,
  Footprint,
  GeneratorFuel,
  Item,
  ItemAmount,
  ItemForm,
  NodeType,
  Purity,
  Recipe,
  ResourceNode,
  Schematic,
  SchematicType,
  Source,
  Sourced,
} from '../types.ts';
import {
  type DocsClass,
  bool,
  cleanRecipeName,
  indexByNative,
  num,
  parseClassList,
  parseForm,
  parseItemAmounts,
  readDocsFile,
  round,
  str,
} from './docs.ts';
import {
  GAME_VERSION,
  GENERATED_DIR,
  RAW_DIR,
  RETRIEVED_AT,
  SOURCES,
  WIKI,
  WIKI_SNAPSHOT_PATH,
  wikiPageSource,
} from './sources.ts';
import type { WikiSnapshot } from './wiki.ts';

// ---------------------------------------------------------------------------
// Inputs

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run \`npm run data:fetch\` first.`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const docsPath = argValue('--docs') ?? join(RAW_DIR, SOURCES.docs.file);
if (!existsSync(docsPath)) {
  throw new Error(`Docs not found at ${docsPath}. Run \`npm run data:fetch\` or pass --docs.`);
}
const natives = indexByNative(readDocsFile(docsPath));
const classesOf = (...names: string[]): DocsClass[] => names.flatMap((n) => natives.get(n) ?? []);

// ---------------------------------------------------------------------------
// Items

const ITEM_NATIVES = [
  'FGItemDescriptor',
  'FGResourceDescriptor',
  'FGItemDescriptorBiomass',
  'FGItemDescriptorNuclearFuel',
  'FGItemDescriptorPowerBoosterFuel',
  'FGPowerShardDescriptor',
  'FGEquipmentDescriptor',
  'FGConsumableDescriptor',
  'FGAmmoTypeProjectile',
  'FGAmmoTypeSpreadshot',
  'FGAmmoTypeInstantHit',
];

const resourceIds = new Set(classesOf('FGResourceDescriptor').map((c) => c.ClassName));

const items: Item[] = [];
const formById = new Map<string, ItemForm>();
for (const cls of classesOf(...ITEM_NATIVES)) {
  const form = parseForm(str(cls, 'mForm'));
  const name = str(cls, 'mDisplayName').trim();
  if (!form || !name) continue;
  const energy = num(cls, 'mEnergyValue');
  items.push({
    id: cls.ClassName,
    name,
    description: str(cls, 'mDescription').replace(/\r\n/g, '\n').trim(),
    form,
    sinkPoints: num(cls, 'mResourceSinkPoints'),
    // Fluids store MJ per litre; convert to MJ per m³.
    energyMJ: round(form === 'solid' ? energy : energy * 1000, 3),
    radioactive: num(cls, 'mRadioactiveDecay') > 0,
    isResource: resourceIds.has(cls.ClassName),
  });
  formById.set(cls.ClassName, form);
}

/**
 * Items referenced by schematics/costs whose descriptors are not exported in Docs.
 * Values from the Satisfactory Wiki.
 */
const MANUAL_ITEMS: Item[] = [
  {
    id: 'Desc_HardDrive_C',
    name: 'Hard Drive',
    description: 'Recovered from crash sites. Scan in the MAM to choose an alternate recipe.',
    form: 'solid',
    sinkPoints: 0,
    energyMJ: 0,
    radioactive: false,
    isResource: false,
  },
  {
    id: 'Desc_ResourceSinkCoupon_C',
    name: 'FICSIT Coupon',
    description: 'Earned from the AWESOME Sink; spent in the AWESOME Shop.',
    form: 'solid',
    sinkPoints: 0,
    energyMJ: 0,
    radioactive: false,
    isResource: false,
  },
];
/** Items that came from MANUAL_ITEMS (the wiki) rather than the Docs. */
const wikiItems = new Set<string>();
for (const manual of MANUAL_ITEMS) {
  if (!formById.has(manual.id)) {
    items.push(manual);
    wikiItems.add(manual.id);
    formById.set(manual.id, manual.form);
  }
}

/** Converts raw Docs amounts to player units (fluids are stored in litres). */
function toPlayerAmounts(raw: { item: string; amount: number }[]): ItemAmount[] {
  return raw.map(({ item, amount }) => {
    const form = formById.get(item);
    return { item, amount: round(form && form !== 'solid' ? amount / 1000 : amount, 4) };
  });
}

// ---------------------------------------------------------------------------
// Buildings

const variablePowerBuildings = new Set(
  classesOf('FGBuildableManufacturerVariablePower').map((c) => c.ClassName),
);

const footprints = new Map<string, Footprint>();
{
  const raw = readJson<
    {
      id: string;
      clearance?: { width: number | null; length: number | null; height: number | null };
    }[]
  >(join(RAW_DIR, SOURCES.footprints.file));
  for (const b of raw) {
    const c = b.clearance;
    if (c?.width && c.length) {
      footprints.set(b.id, {
        w: round(c.width, 2),
        l: round(c.length, 2),
        h: round(c.height ?? 0, 2),
      });
    }
  }
}

const buildings = new Map<string, Building>();

function addBuilding(
  cls: DocsClass,
  partial: Omit<Building, 'id' | 'name' | 'buildCost' | 'footprint'>,
): void {
  const footprint = footprints.get(cls.ClassName);
  buildings.set(cls.ClassName, {
    id: cls.ClassName,
    name: str(cls, 'mDisplayName').trim(),
    buildCost: [],
    ...(footprint ? { footprint } : {}),
    ...partial,
  });
}

/**
 * Docs report 0 Somersloop slots for the Smelter, but in game it accepts 1
 * (Satisfactory Wiki, "Production amplifier"). Packager genuinely has 0.
 */
const SLOOP_SLOT_OVERRIDES: Record<string, number> = { Build_SmelterMk1_C: 1 };

for (const cls of classesOf('FGBuildableManufacturer', 'FGBuildableManufacturerVariablePower')) {
  const variable = variablePowerBuildings.has(cls.ClassName);
  addBuilding(cls, {
    category: 'production',
    powerMW: variable ? 0 : num(cls, 'mPowerConsumption'),
    powerExponent: num(cls, 'mPowerConsumptionExponent', 1.321929),
    sloopSlots: SLOOP_SLOT_OVERRIDES[cls.ClassName] ?? num(cls, 'mProductionShardSlotSize'),
    ...(variable
      ? {
          variablePower: {
            minMW: num(cls, 'mEstimatedMininumPowerConsumption'),
            maxMW: num(cls, 'mEstimatedMaximumPowerConsumption'),
          },
        }
      : {}),
  });
}

for (const cls of classesOf(
  'FGBuildableResourceExtractor',
  'FGBuildableWaterPump',
  'FGBuildableFrackingExtractor',
)) {
  const forms = str(cls, 'mAllowedResourceForms');
  const fluid = !forms.includes('RF_SOLID');
  const perCycle = num(cls, 'mItemsPerCycle') / (fluid ? 1000 : 1);
  addBuilding(cls, {
    category: 'extractor',
    powerMW: num(cls, 'mPowerConsumption'),
    powerExponent: num(cls, 'mPowerConsumptionExponent', 1.321929),
    sloopSlots: 0,
    extractor: {
      baseRatePerMin: round((perCycle / num(cls, 'mExtractCycleTime', 1)) * 60, 4),
      resources: bool(cls, 'mOnlyAllowCertainResources')
        ? parseClassList(str(cls, 'mAllowedResources'))
        : [],
    },
  });
}

for (const cls of classesOf('FGBuildableFrackingActivator')) {
  addBuilding(cls, {
    category: 'extractor',
    powerMW: num(cls, 'mPowerConsumption'),
    powerExponent: num(cls, 'mPowerConsumptionExponent', 1.321929),
    sloopSlots: 0,
  });
}

for (const cls of classesOf('FGBuildableGeneratorFuel', 'FGBuildableGeneratorNuclear')) {
  const fuels = Array.isArray(cls.mFuel) ? (cls.mFuel as Record<string, string>[]) : [];
  const parsedFuels: GeneratorFuel[] = fuels
    .filter((f) => f.mFuelClass)
    .map((f) => ({
      item: String(f.mFuelClass),
      ...(f.mSupplementalResourceClass ? { supplemental: f.mSupplementalResourceClass } : {}),
      ...(f.mByproduct
        ? {
            byproduct: { item: f.mByproduct, amount: Number.parseFloat(f.mByproductAmount ?? '0') },
          }
        : {}),
    }));
  addBuilding(cls, {
    category: 'generator',
    powerMW: 0,
    powerExponent: 1,
    sloopSlots: 0,
    generator: {
      powerMW: num(cls, 'mPowerProduction'),
      fuels: parsedFuels,
      // Ratio is litres/s per MW → m³/min per MW.
      supplementalPerMW: round((num(cls, 'mSupplementalToPowerRatio') * 60) / 1000, 6),
    },
  });
}

for (const cls of classesOf('FGBuildableGeneratorGeoThermal')) {
  addBuilding(cls, {
    category: 'generator',
    powerMW: 0,
    powerExponent: 1,
    sloopSlots: 0,
    // Average output on a normal geyser; purity scales it ×0.5 / ×1 / ×2.
    generator: {
      powerMW: num(cls, 'mVariablePowerProductionFactor', 200),
      fuels: [],
      supplementalPerMW: 0,
    },
  });
}

for (const cls of classesOf('FGBuildableConveyorBelt', 'FGBuildableConveyorLift')) {
  addBuilding(cls, {
    category: 'logistics',
    powerMW: 0,
    powerExponent: 1,
    sloopSlots: 0,
    beltRate: num(cls, 'mSpeed') / 2,
  });
}

for (const cls of classesOf('FGBuildablePipeline')) {
  if (cls.ClassName.includes('NoIndicator')) continue;
  addBuilding(cls, {
    category: 'logistics',
    powerMW: 0,
    powerExponent: 1,
    sloopSlots: 0,
    pipeRate: num(cls, 'mFlowLimit') * 60,
  });
}

// ---------------------------------------------------------------------------
// Recipes

const WORKBENCH = new Set([
  'BP_WorkBenchComponent_C',
  'FGBuildableAutomatedWorkBench',
  'Build_AutomatedWorkBench_C',
]);
const BUILD_GUN = new Set(['BP_BuildGun_C', 'FGBuildGun']);
const WORKSHOP = new Set(['BP_WorkshopComponent_C']);

const recipes: Recipe[] = [];
const buildRecipeByProduct = new Map<string, Recipe>();

for (const cls of classesOf('FGRecipe')) {
  const producers = parseClassList(str(cls, 'mProducedIn'));
  const producedIn = producers.filter((p) => buildings.get(p)?.category === 'production');
  const handcraft = producers.some((p) => WORKBENCH.has(p));
  const buildGun = producers.some((p) => BUILD_GUN.has(p));
  const workshop = producers.some((p) => WORKSHOP.has(p));
  if (!producedIn.length && !handcraft && !buildGun && !workshop) continue;

  const rawName = str(cls, 'mDisplayName').trim();
  const alternate = cls.ClassName.includes('_Alternate_') || rawName.startsWith('Alternate:');
  const constant = num(cls, 'mVariablePowerConsumptionConstant');
  const factor = num(cls, 'mVariablePowerConsumptionFactor', 1);
  const variable = producedIn.some((p) => variablePowerBuildings.has(p));

  const recipe: Recipe = {
    id: cls.ClassName,
    name: cleanRecipeName(rawName),
    alternate,
    durationS: num(cls, 'mManufactoringDuration'),
    ingredients: toPlayerAmounts(parseItemAmounts(str(cls, 'mIngredients'))),
    products: toPlayerAmounts(parseItemAmounts(str(cls, 'mProduct'))),
    producedIn,
    handcraft,
    buildGun,
    workshop,
    ...(variable ? { variablePower: { minMW: constant, maxMW: constant + factor } } : {}),
  };
  recipes.push(recipe);
  if (buildGun && recipe.products[0]) buildRecipeByProduct.set(recipe.products[0].item, recipe);
}

// Attach build costs: building recipe products are `Desc_X_C` for `Build_X_C`.
for (const building of buildings.values()) {
  const recipe = buildRecipeByProduct.get(building.id.replace(/^Build_/, 'Desc_'));
  if (recipe) building.buildCost = recipe.ingredients;
}

// ---------------------------------------------------------------------------
// Schematics

const SCHEMATIC_TYPES: Record<string, SchematicType> = {
  EST_Tutorial: 'tutorial',
  EST_Milestone: 'milestone',
  EST_MAM: 'mam',
  EST_Alternate: 'alternate',
  EST_HardDrive: 'hard-drive',
  EST_ResourceSink: 'resource-sink',
  EST_Custom: 'custom',
  EST_Customization: 'customization',
};

const MAM_TREES: [RegExp, string][] = [
  [/^Research_Alien_/, 'Alien Technology'],
  [/^Research_Caterium_/, 'Caterium'],
  [/^Research_Quartz_/, 'Quartz'],
  [/^Research_Sulfur_/, 'Sulfur'],
  [/^Research_Mycelia_/, 'Mycelia'],
  [/^Research_Nutrients_/, 'Nutrients'],
  [/^Research_PowerSlugs_/, 'Power Slugs'],
  [/^Research_(ACarapace|AOrgans|AOrganisms|AO)_/, 'Alien Organisms'],
  [/^Research_FlowerPetals_/, 'Flower Petals'],
  [/^Research_HardDrive_/, 'Hard Drive'],
];

const KEPT_SCHEMATIC_TYPES = new Set<SchematicType>([
  'tutorial',
  'milestone',
  'mam',
  'alternate',
  'hard-drive',
  'custom',
]);

const schematics: Schematic[] = [];
for (const cls of classesOf('FGSchematic')) {
  const type = SCHEMATIC_TYPES[str(cls, 'mType')];
  const name = str(cls, 'mDisplayName').trim();
  if (!type || !KEPT_SCHEMATIC_TYPES.has(type)) continue;
  if (/^Research_XMas/.test(cls.ClassName) || /^Discontinued/i.test(name)) continue;
  if (type === 'mam' && !name) continue;

  const unlocks = {
    recipes: [] as string[],
    schematics: [] as string[],
    scannerResources: [] as string[],
    scannerObjects: [] as string[],
    inventorySlots: 0,
    armSlots: 0,
  };
  for (const unlock of Array.isArray(cls.mUnlocks)
    ? (cls.mUnlocks as Record<string, string>[])
    : []) {
    switch (unlock.Class) {
      case 'BP_UnlockRecipe_C':
        unlocks.recipes.push(...parseClassList(unlock.mRecipes ?? ''));
        break;
      case 'BP_UnlockSchematic_C':
        unlocks.schematics.push(...parseClassList(unlock.mSchematics ?? ''));
        break;
      case 'BP_UnlockScannableResource_C':
        unlocks.scannerResources.push(
          ...parseClassList(
            `${unlock.mResourcesToAddToScanner ?? ''}${unlock.mResourcePairsToAddToScanner ?? ''}`,
          ),
        );
        break;
      case 'BP_UnlockScannableObject_C':
        unlocks.scannerObjects.push(...parseClassList(unlock.mScannableObjects ?? ''));
        break;
      case 'BP_UnlockInventorySlot_C':
        unlocks.inventorySlots += Number.parseInt(unlock.mNumInventorySlotsToUnlock ?? '0', 10);
        break;
      case 'BP_UnlockArmEquipmentSlot_C':
        unlocks.armSlots += Number.parseInt(unlock.mNumArmEquipmentSlotsToUnlock ?? '0', 10);
        break;
      default:
        break;
    }
  }

  const deps = Array.isArray(cls.mSchematicDependencies)
    ? (cls.mSchematicDependencies as Record<string, string>[]).flatMap((d) =>
        parseClassList(d.mSchematics ?? ''),
      )
    : [];
  const mamTree =
    type === 'mam' ? MAM_TREES.find(([re]) => re.test(cls.ClassName))?.[1] : undefined;

  schematics.push({
    id: cls.ClassName,
    name,
    type,
    tier: num(cls, 'mTechTier'),
    cost: toPlayerAmounts(parseItemAmounts(str(cls, 'mCost'))),
    timeS: num(cls, 'mTimeToComplete'),
    unlocks,
    dependsOn: [...new Set(deps)],
    ...(mamTree ? { mamTree } : {}),
  });
}

// ---------------------------------------------------------------------------
// World: resource nodes and collectibles (cm → m)

const cmToM = (cm: number): number => round(cm / 100, 1);

interface RawNode {
  id: string;
  resource: string;
  purity: Purity;
  nodeType: string;
  x: number;
  y: number;
  z: number;
}

const NODE_TYPES: Record<string, NodeType> = {
  node: 'node',
  frackingCore: 'well-core',
  frackingSatellite: 'well-satellite',
  geyser: 'geyser',
};

const nodes: ResourceNode[] = readJson<RawNode[]>(join(RAW_DIR, SOURCES.nodes.file)).flatMap(
  (n) => {
    const type = NODE_TYPES[n.nodeType];
    if (!type) return [];
    return [
      {
        id: n.id,
        resource: n.resource === 'Desc_GeothermalEnergy_C' ? 'geothermal' : n.resource,
        purity: n.purity,
        type,
        x: cmToM(n.x),
        y: cmToM(n.y),
        z: cmToM(n.z),
      },
    ];
  },
);

interface RawCollectible {
  id: string;
  type: string;
  x: number;
  y: number;
  z?: number;
  unlockCost?: { item: string; amount: number }[];
}

const COLLECTIBLE_TYPES: Record<string, CollectibleType> = {
  mercerSphere: 'mercerSphere',
  somersloop: 'somersloop',
  hardDrive: 'hardDrive',
  slugMk1: 'slugBlue',
  slugMk2: 'slugYellow',
  slugMk3: 'slugPurple',
};

const collectibles: Collectible[] = readJson<RawCollectible[]>(
  join(RAW_DIR, SOURCES.collectibles.file),
).flatMap((c) => {
  const type = COLLECTIBLE_TYPES[c.type];
  if (!type) return [];
  return [
    {
      id: c.id,
      type,
      x: cmToM(c.x),
      y: cmToM(c.y),
      z: cmToM(c.z ?? 0),
      ...(c.unlockCost?.length ? { unlockCost: c.unlockCost } : {}),
    },
  ];
});

// ---------------------------------------------------------------------------
// Satisfactory Wiki: patch history, categories and tier phases
//
// Read from the pinned snapshot (`npm run data:wiki` refreshes it). Each page
// is cited by a source that pins its revision; categories come from the live
// category listing, so they cite the unpinned wiki source.

const wikiSnapshot = readJson<WikiSnapshot>(WIKI_SNAPSHOT_PATH);
const wikiPageSources = new Map<string, Source>();
/** Extra sources per record, from the wiki. */
const wikiCites = new Map<string, Set<string>>();
const cite = (recordId: string, sourceId: string): void => {
  if (!wikiCites.has(recordId)) wikiCites.set(recordId, new Set());
  wikiCites.get(recordId)!.add(sourceId);
};
const itemById = new Map(items.map((i) => [i.id, i]));
{
  for (const page of wikiSnapshot.pages) {
    const ids = page.classes.flatMap(({ kind, className }) => {
      // Building infoboxes name the descriptor (`Desc_ConstructorMk1_C`), the model the buildable.
      const building = buildings.get(className.replace(/^Desc_/, 'Build_'));
      if (kind === 'building' && building) return [building.id];
      return itemById.has(className) ? [className] : [];
    });
    if (!ids.length) continue;
    const source = wikiPageSource(page.title, page.revid, wikiSnapshot.retrievedAt);
    for (const id of ids) {
      const record = itemById.get(id) ?? buildings.get(id);
      if (!record) continue;
      if (page.history.length) {
        record.history = page.history;
        wikiPageSources.set(source.id, source);
        cite(id, source.id);
      }
      if (itemById.has(id) && page.categories.length) {
        const item = itemById.get(id)!;
        item.wikiCategories = [
          ...new Set([...(item.wikiCategories ?? []), ...page.categories]),
        ].sort();
        cite(id, WIKI.id);
      }
    }
  }
  const { phases, revid, title } = wikiSnapshot.tierPhases;
  const source = wikiPageSource(title, revid, wikiSnapshot.retrievedAt);
  for (const s of schematics) {
    const phase = s.type === 'milestone' ? phases[s.tier] : undefined;
    if (phase !== undefined) {
      s.phase = phase;
      wikiPageSources.set(source.id, source);
      cite(s.id, source.id);
    }
  }
}
const wikiCited = (id: string): string[] => [...(wikiCites.get(id) ?? [])].sort();

// ---------------------------------------------------------------------------
// Output

const byId = <T extends { id: string }>(a: T, b: T): number => a.id.localeCompare(b.id);

/** One record per line keeps git diffs readable when the game data changes. */
function writeRows(file: string, rows: unknown[]): void {
  const body = rows.length ? `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n` : '[]\n';
  writeFileSync(join(GENERATED_DIR, file), body);
}

mkdirSync(GENERATED_DIR, { recursive: true });

/** Adds `derivedFrom`: the IDs of the sources a record's facts come from. */
const tag = <T>(rows: T[], from: (row: T) => string[]): Sourced<T>[] =>
  rows.map((row) => ({ ...row, derivedFrom: from(row) }));
const docs = (): string[] => [SOURCES.docs.id];

const buildingList = [...buildings.values()].sort(byId);
writeRows(
  'items.json',
  tag(items.sort(byId), (i) => [
    ...new Set([...(wikiItems.has(i.id) ? [WIKI.id] : docs()), ...wikiCited(i.id)]),
  ]),
);
writeRows('recipes.json', tag(recipes.sort(byId), docs));
writeRows(
  'buildings.json',
  tag(buildingList, (b) => [
    SOURCES.docs.id,
    ...(b.footprint ? [SOURCES.footprints.id] : []),
    ...(b.id in SLOOP_SLOT_OVERRIDES ? [WIKI.id] : []),
    ...wikiCited(b.id),
  ]),
);
writeRows(
  'schematics.json',
  tag(schematics.sort(byId), (s) => [...docs(), ...wikiCited(s.id)]),
);
writeRows(
  'nodes.json',
  tag(nodes.sort(byId), () => [SOURCES.nodes.id]),
);
writeRows(
  'collectibles.json',
  tag(collectibles.sort(byId), () => [SOURCES.collectibles.id]),
);

const counts: Record<string, number> = {
  items: items.length,
  recipes: recipes.length,
  buildings: buildingList.length,
  schematics: schematics.length,
  nodes: nodes.length,
  collectibles: collectibles.length,
};
const meta: DataMeta = {
  generatedAt: RETRIEVED_AT,
  gameVersion: GAME_VERSION,
  // Every source a record cites; the cross-check informs no record.
  sources: [
    ...[...Object.values(SOURCES).filter((s) => s !== SOURCES.crossCheck), WIKI].map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      licence: s.licence,
      retrievedAt: RETRIEVED_AT,
    })),
    ...[...wikiPageSources.values()].sort((a, b) => a.id.localeCompare(b.id)),
  ],
  counts,
};
writeFileSync(join(GENERATED_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

process.stdout.write(
  `✓ Generated ${Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ')}\n`,
);
