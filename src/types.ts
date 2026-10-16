/**
 * TypeScript view of the game-data model, mirroring model/ficsit.linkml.yaml
 * (copied from the FICSIT Field Guide, which produces the input JSON). Units: rates per minute, fluids in m³,
 * power in MW, world coordinates in metres (x east, y south; north is −y).
 */

export type ItemForm = 'solid' | 'liquid' | 'gas';

export type Purity = 'impure' | 'normal' | 'pure';

export const PURITIES: readonly Purity[] = ['impure', 'normal', 'pure'];

export interface ItemAmount {
  item: string;
  amount: number;
}

/** One patch's change to an item or building, from the Satisfactory Wiki's History section. */
export interface HistoryEntry {
  /** Patch ID such as `1.0`, `0.3.4.6` or `Closed Alpha 3`; `unknown` when the wiki names none. */
  patch: string;
  /** The change, as the wiki words it (plain text); absent when the wiki gives only nested bullets. */
  summary?: string;
  /** Nested bullets, one per line, two spaces of indent per extra level. */
  details?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  form: ItemForm;
  /** AWESOME Sink points per item (0 if unsinkable). */
  sinkPoints: number;
  /** Energy in MJ per item, or per m³ for fluids (0 if not a fuel). */
  energyMJ: number;
  radioactive: boolean;
  /** True for raw resources that are extracted from the world. */
  isResource: boolean;
  /** Satisfactory Wiki categories that classify the item (for example `Crafting components`). */
  wikiCategories?: string[];
  /** Patch history from the Satisfactory Wiki, newest first. */
  history?: HistoryEntry[];
}

export interface VariablePower {
  minMW: number;
  maxMW: number;
}

export interface Recipe {
  id: string;
  name: string;
  alternate: boolean;
  durationS: number;
  ingredients: ItemAmount[];
  products: ItemAmount[];
  /** Factory building IDs (`Build_*_C`) that can run this recipe. */
  producedIn: string[];
  /** Craftable at the Craft Bench. */
  handcraft: boolean;
  /** Built with the Build Gun (buildings, foundations, etc.). */
  buildGun: boolean;
  /** Crafted at the Equipment Workshop. */
  workshop: boolean;
  /** Recipe-specific power range for variable-power buildings. */
  variablePower?: VariablePower;
}

export type BuildingCategory = 'production' | 'extractor' | 'generator' | 'logistics';

export interface Footprint {
  /** Width (m), along the manifold. */
  w: number;
  /** Length (m), perpendicular to the manifold. */
  l: number;
  /** Height (m). */
  h: number;
}

export interface GeneratorFuel {
  item: string;
  supplemental?: string;
  byproduct?: ItemAmount;
}

export interface GeneratorSpec {
  powerMW: number;
  fuels: GeneratorFuel[];
  /** Supplemental (water) m³/min consumed per MW produced. */
  supplementalPerMW: number;
}

export interface ExtractorSpec {
  /** Items (or m³) per minute at 100% on a normal node. */
  baseRatePerMin: number;
  /** Allowed resource IDs; empty means any solid resource. */
  resources: string[];
}

export interface Building {
  id: string;
  name: string;
  category: BuildingCategory;
  /** Base power draw (MW) at 100%; 0 for generators and logistics. */
  powerMW: number;
  /** Overclock power exponent (1.321929 for most production buildings). */
  powerExponent: number;
  /** Somersloop (production amplifier) slots. */
  sloopSlots: number;
  footprint?: Footprint;
  buildCost: ItemAmount[];
  extractor?: ExtractorSpec;
  generator?: GeneratorSpec;
  /** Belt or lift throughput (items/min). */
  beltRate?: number;
  /** Pipeline throughput (m³/min). */
  pipeRate?: number;
  /** Variable-power buildings expose a nominal range; recipes override it. */
  variablePower?: VariablePower;
  /** Patch history from the Satisfactory Wiki, newest first. */
  history?: HistoryEntry[];
}

export type SchematicType =
  | 'tutorial'
  | 'milestone'
  | 'mam'
  | 'alternate'
  | 'hard-drive'
  | 'resource-sink'
  | 'custom'
  | 'customization';

export interface SchematicUnlocks {
  recipes: string[];
  schematics: string[];
  scannerResources: string[];
  scannerObjects: string[];
  inventorySlots: number;
  armSlots: number;
}

export interface Schematic {
  id: string;
  name: string;
  type: SchematicType;
  /** Tech tier (0 for HUB upgrades/tutorial). */
  tier: number;
  /** Space Elevator phase in which a milestone's tier opens (Satisfactory Wiki, "Milestones"). */
  phase?: number;
  cost: ItemAmount[];
  timeS: number;
  unlocks: SchematicUnlocks;
  dependsOn: string[];
  /** MAM research tree, for `type === 'mam'`. */
  mamTree?: string;
}

export type NodeType = 'node' | 'well-core' | 'well-satellite' | 'geyser';

export interface ResourceNode {
  id: string;
  /** Item ID of the resource, or `geothermal` for geysers. */
  resource: string;
  purity: Purity;
  type: NodeType;
  x: number;
  y: number;
  z: number;
}

export type CollectibleType =
  'mercerSphere' | 'somersloop' | 'hardDrive' | 'slugBlue' | 'slugYellow' | 'slugPurple';

export interface Collectible {
  id: string;
  type: CollectibleType;
  x: number;
  y: number;
  z: number;
  /** Item cost to open a crash site (Hard Drives only). */
  unlockCost?: ItemAmount[];
}

/** A pinned upstream source that records cite in `derivedFrom`. */
export interface Source {
  id: string;
  name: string;
  /** Pinned URL: a commit-pinned file, or a wiki page. */
  url: string;
  licence: string;
  /** ISO date (YYYY-MM-DD) the pinned revision was fetched. */
  retrievedAt: string;
}

/** A record with the sources its facts come from (`prov:wasDerivedFrom` in RDF). */
export type Sourced<T> = T & { derivedFrom: string[] };

/** The full bundle: every collection, plus the sources its records cite. */
export interface GameData {
  items: Sourced<Item>[];
  recipes: Sourced<Recipe>[];
  buildings: Sourced<Building>[];
  schematics: Sourced<Schematic>[];
  resourceNodes: Sourced<ResourceNode>[];
  collectibles: Sourced<Collectible>[];
  sources: Source[];
}

export interface DataMeta {
  generatedAt: string;
  gameVersion: string;
  sources: Source[];
  counts: Record<string, number>;
}
