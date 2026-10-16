/**
 * Cross-checks generated recipes against greeny/SatisfactoryTools (1.0 data)
 * and sanity-checks world data counts against known 1.0+ totals.
 *
 * Usage: npm run data:verify   (exit code 1 on unexplained differences)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Building, Collectible, Item, Recipe, Schematic } from '../types.ts';
import { GENERATED_DIR, RAW_DIR, SOURCES, WIKI_SNAPSHOT_PATH } from './sources.ts';
import type { WikiSnapshot } from './wiki.ts';

interface ToolsRecipe {
  className: string;
  time: number;
  inMachine: boolean;
  ingredients: { item: string; amount: number }[];
  products: { item: string; amount: number }[];
  producedIn: string[];
}

const load = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const toolsPath = join(RAW_DIR, SOURCES.crossCheck.file);
if (!existsSync(toolsPath)) throw new Error('Run `npm run data:fetch` first.');

const tools = load<{ recipes: Record<string, ToolsRecipe> }>(toolsPath);
const recipes = load<Recipe[]>(join(GENERATED_DIR, 'recipes.json'));
const items = load<Item[]>(join(GENERATED_DIR, 'items.json'));
const schematics = load<Schematic[]>(join(GENERATED_DIR, 'schematics.json'));
const collectibles = load<Collectible[]>(join(GENERATED_DIR, 'collectibles.json'));
const buildings = load<Building[]>(join(GENERATED_DIR, 'buildings.json'));

/**
 * Differences that are expected because our source is newer (1.1 Docs) than
 * SatisfactoryTools' 1.0 dataset. Add an entry with a reason, never silently.
 */
const KNOWN_DIFFERENCES: Record<string, string> = {};

/** Machine recipes we generate that SatisfactoryTools 1.0 lacks, with the reason. */
const FICSMAS = 'FICSMAS seasonal recipe; SatisfactoryTools omits event content';
const KNOWN_ONLY_OURS: Record<string, string> = Object.fromEntries(
  [
    'Recipe_CandyCane_C',
    'Recipe_Fireworks_01_C',
    'Recipe_Fireworks_02_C',
    'Recipe_Fireworks_03_C',
    'Recipe_Snow_C',
    'Recipe_Snowball_C',
    'Recipe_XmasBall1_C',
    'Recipe_XmasBall2_C',
    'Recipe_XmasBall3_C',
    'Recipe_XmasBall4_C',
    'Recipe_XmasBallCluster_C',
    'Recipe_XmasBow_C',
    'Recipe_XmasBranch_C',
    'Recipe_XmasStar_C',
    'Recipe_XmasWreath_C',
  ].map((id) => [id, FICSMAS]),
);

/** Milestones where the wiki and the Docs disagree, with the reason. Add an entry, never silence. */
const KNOWN_WIKI_MILESTONE_DIFFERENCES: Record<string, string> = {};

const itemIds0 = new Set(items.map((i) => i.id));
const key = (list: { item: string; amount: number }[]): string =>
  list
    .map((x) => `${x.item}×${x.amount}`)
    .sort()
    .join(' + ');

const problems: string[] = [];
const notes: string[] = [];
let compared = 0;

// Structural checks on generated recipes.
const ours = new Map(recipes.map((r) => [r.id, r]));
if (ours.size !== recipes.length) problems.push('recipes.json has duplicate recipe IDs');
const buildingIds = new Set(buildings.map((b) => b.id));
for (const r of recipes) {
  if (!(Number.isFinite(r.durationS) && r.durationS > 0)) {
    problems.push(`${r.id}: duration ${r.durationS} is not a positive number`);
  }
  for (const x of [...r.ingredients, ...r.products]) {
    if (!(Number.isFinite(x.amount) && x.amount > 0)) {
      problems.push(`${r.id}: ${x.item} amount ${x.amount} is not a positive number`);
    }
  }
  for (const b of r.producedIn) {
    if (b.startsWith('Build_') && !buildingIds.has(b)) {
      problems.push(`${r.id}: produced in unknown building ${b}`);
    }
  }
}

// Machine recipe ID sets must match both ways, apart from listed exceptions.
const theirIds = new Set(
  Object.values(tools.recipes)
    .filter((t) => t.inMachine)
    .map((t) => t.className),
);
for (const r of recipes) {
  if (!r.producedIn.length || r.buildGun || theirIds.has(r.id)) continue;
  const reason = KNOWN_ONLY_OURS[r.id];
  if (reason) notes.push(`only in ours: ${r.id} (known: ${reason})`);
  else problems.push(`only in ours (unexplained): ${r.id}`);
}

for (const theirs of Object.values(tools.recipes)) {
  if (!theirs.inMachine) continue;
  const mine = ours.get(theirs.className);
  if (!mine) {
    const reason = KNOWN_DIFFERENCES[theirs.className];
    (reason ? notes : problems).push(
      `missing from recipes.json: ${theirs.className}${reason ? ` (known: ${reason})` : ''}`,
    );
    continue;
  }
  compared += 1;
  const diffs: string[] = [];
  if (mine.durationS !== theirs.time) diffs.push(`time ${mine.durationS} vs ${theirs.time}`);
  if (key(mine.ingredients) !== key(theirs.ingredients)) {
    diffs.push(`ingredients [${key(mine.ingredients)}] vs [${key(theirs.ingredients)}]`);
  }
  if (key(mine.products) !== key(theirs.products)) {
    diffs.push(`products [${key(mine.products)}] vs [${key(theirs.products)}]`);
  }
  const producers = (list: string[]): string =>
    list
      .map((p) => p.replace(/^(Desc|Build)_/, ''))
      .sort()
      .join(',');
  if (producers(mine.producedIn) !== producers(theirs.producedIn)) {
    diffs.push(`producedIn ${producers(mine.producedIn)} vs ${producers(theirs.producedIn)}`);
  }
  if (diffs.length) {
    const reason = KNOWN_DIFFERENCES[mine.id];
    (reason ? notes : problems).push(
      `${mine.id}: ${diffs.join('; ')}${reason ? ` (known: ${reason})` : ''}`,
    );
  }
}

// Milestones: the Satisfactory Wiki's tables against the Docs (names, costs, research times).
const wiki = load<WikiSnapshot>(WIKI_SNAPSHOT_PATH);
const itemIdByName = new Map(items.map((i) => [i.name.toLowerCase(), i.id]));
// The wiki writes the singular where the game says "Screws".
itemIdByName.set('screw', 'Desc_IronScrew_C');
let milestonesCompared = 0;
for (const m of wiki.milestones.filter((x) => x.tier >= 1)) {
  const sch = schematics.find(
    (s) =>
      s.type === 'milestone' && s.tier === m.tier && s.name.toLowerCase() === m.name.toLowerCase(),
  );
  if (!sch) {
    problems.push(`wiki milestone "${m.name}" (tier ${m.tier}) is not in schematics.json`);
    continue;
  }
  milestonesCompared += 1;
  const ours = key(sch.cost);
  const theirs = key(
    m.cost.map((c) => ({
      item: itemIdByName.get(c.item.toLowerCase()) ?? `?${c.item}`,
      amount: c.amount,
    })),
  );
  const diffs: string[] = [];
  if (ours !== theirs) diffs.push(`cost [${ours}] vs wiki [${theirs}]`);
  if (sch.timeS !== m.timeS) diffs.push(`time ${sch.timeS}s vs wiki ${m.timeS}s`);
  if (diffs.length) {
    const reason = KNOWN_WIKI_MILESTONE_DIFFERENCES[sch.id];
    (reason ? notes : problems).push(
      `${sch.id} (${sch.name}): ${diffs.join('; ')}${reason ? ` (known: ${reason})` : ''}`,
    );
  }
}
const unresolvedWikiClasses = wiki.pages.flatMap((p) =>
  p.classes
    .filter(({ kind, className }) =>
      kind === 'building'
        ? !buildingIds.has(className.replace(/^Desc_/, 'Build_'))
        : !itemIds0.has(className),
    )
    .map((c) => `${p.title}: ${c.className}`),
);
notes.push(
  `${unresolvedWikiClasses.length} wiki infobox classes name something not in this model (for example building variants); they are skipped`,
);

// World totals as of 1.0 (Satisfactory Wiki).
const EXPECTED_COLLECTIBLES: Record<string, number> = {
  mercerSphere: 298,
  somersloop: 106,
  hardDrive: 118,
  slugBlue: 596,
  slugYellow: 389,
  slugPurple: 257,
};
for (const [type, expected] of Object.entries(EXPECTED_COLLECTIBLES)) {
  const actual = collectibles.filter((c) => c.type === type).length;
  if (actual !== expected) problems.push(`collectibles: ${type} ${actual} ≠ expected ${expected}`);
}

// Every referenced item must exist.
const itemIds = new Set(items.map((i) => i.id));
const missing = new Set<string>();
for (const r of recipes) {
  if (r.buildGun && !r.producedIn.length) continue; // building descriptors aren't items
  for (const x of [...r.ingredients, ...r.products]) if (!itemIds.has(x.item)) missing.add(x.item);
}
for (const s of schematics) for (const x of s.cost) if (!itemIds.has(x.item)) missing.add(x.item);
for (const c of collectibles)
  for (const x of c.unlockCost ?? []) if (!itemIds.has(x.item)) missing.add(x.item);
for (const id of missing) problems.push(`referenced item missing from items.json: ${id}`);

process.stdout.write(`Compared ${compared} machine recipes against SatisfactoryTools 1.0.\n`);
process.stdout.write(`Compared ${milestonesCompared} milestones against the Satisfactory Wiki.\n`);
for (const n of notes) process.stdout.write(`  note: ${n}\n`);
if (problems.length) {
  for (const p of problems) process.stdout.write(`  ✗ ${p}\n`);
  process.stdout.write(`✗ ${problems.length} unexplained difference(s).\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('✓ No unexplained differences.\n');
}
