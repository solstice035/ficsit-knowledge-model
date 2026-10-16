/**
 * Pinned upstream data sources. Bump the SHAs deliberately, then run
 * `npm run data:fetch && npm run data:build && npm run data:verify`.
 * Ported from the FICSIT Field Guide data pipeline (see data/README.md).
 */
import { fileURLToPath } from 'node:url';
import type { Source } from '../types.ts';

export const RAW_DIR = fileURLToPath(new URL('../../data/raw/', import.meta.url));
/** Committed SHA-256 hashes of every raw source (`npm run data:fetch` checks them). */
export const LOCK_PATH = fileURLToPath(new URL('../../data/sources.lock.json', import.meta.url));
export const GENERATED_DIR = fileURLToPath(new URL('../../data/generated/', import.meta.url));
/** Pinned Satisfactory Wiki revisions (committed; refreshed by `npm run data:wiki`). */
export const WIKI_SNAPSHOT_DIR = fileURLToPath(new URL('../../data/wiki/', import.meta.url));
export const WIKI_SNAPSHOT_PATH = `${WIKI_SNAPSHOT_DIR}snapshot.json`;

/**
 * When the pinned revisions below were chosen and fetched. Written to meta.json
 * as `generatedAt` instead of today's date, so a rebuild is byte-identical.
 * Update it whenever you bump a SHA.
 */
export const RETRIEVED_AT = '2026-10-10';

export const GAME_VERSION =
  'Update 1.1 Docs (valid for 1.2: no production recipe or milestone changes)';

const LOGISTICS_SHA = 'bbd951f26507432d3e50923fb02d0348829b0752';
const TOOLS_SHA = 'a1eb2fef1d5293baa5cd33ae88d08032600c6996';

const logistics = (path: string): string =>
  `https://raw.githubusercontent.com/rockfactory/satisfactory-logistics/${LOGISTICS_SHA}/${path}`;

export interface PipelineSource {
  /** Stable ID that records cite in `derivedFrom`, e.g. `source-docs-en`. */
  id: string;
  /** Local file name inside `data/raw/`. */
  file: string;
  url: string;
  name: string;
  licence: string;
}

export const SOURCES = {
  docs: {
    id: 'source-docs-en',
    file: 'docs-en.json',
    url: logistics('data/docs-en.json'),
    name: 'Satisfactory Docs (en-US), via rockfactory/satisfactory-logistics',
    licence: 'Game data © Coffee Stain Studios; repository MIT',
  },
  nodes: {
    id: 'source-world-resource-nodes',
    file: 'WorldResourceNodes.json',
    url: logistics('src/recipes/WorldResourceNodes.json'),
    name: 'World resource nodes (rockfactory/satisfactory-logistics ← Hirashi3630/satisfactory_node_heatmap)',
    licence: 'MIT',
  },
  collectibles: {
    id: 'source-world-collectibles',
    file: 'WorldCollectibles.json',
    url: logistics('src/recipes/WorldCollectibles.json'),
    name: 'World collectibles (rockfactory/satisfactory-logistics)',
    licence: 'MIT',
  },
  footprints: {
    id: 'source-factory-buildings',
    file: 'FactoryBuildings.json',
    url: logistics('src/recipes/FactoryBuildings.json'),
    name: 'Building clearance boxes (rockfactory/satisfactory-logistics)',
    licence: 'MIT',
  },
  crossCheck: {
    id: 'source-satisfactory-tools',
    file: 'satisfactory-tools-data1.0.json',
    url: `https://raw.githubusercontent.com/greeny/SatisfactoryTools/${TOOLS_SHA}/data/data1.0.json`,
    name: 'greeny/SatisfactoryTools data1.0.json (cross-check only)',
    licence: 'MIT',
  },
} as const satisfies Record<string, PipelineSource>;

/**
 * Facts the Docs don't export, entered by hand from the Satisfactory Wiki
 * (MANUAL_ITEMS and SLOOP_SLOT_OVERRIDES in build-data.ts). Not fetched, and
 * not pinned to a page revision yet.
 */
export const WIKI = {
  id: 'source-satisfactory-wiki',
  url: 'https://satisfactory.wiki.gg/',
  name: 'Satisfactory Wiki',
  licence: 'CC BY-NC-SA',
} as const;

/**
 * A wiki page pinned to one revision: the `oldid` permalink never changes, so
 * records that cite it can be checked against exactly the text they came from.
 */
export function wikiPageSource(title: string, revid: number, retrievedAt: string): Source {
  const page = encodeURIComponent(title.replace(/ /g, '_'));
  return {
    id: `source-wiki-r${revid}`,
    name: `Satisfactory Wiki: ${title} (revision ${revid})`,
    url: `https://satisfactory.wiki.gg/index.php?title=${page}&oldid=${revid}`,
    licence: WIKI.licence,
    retrievedAt,
  };
}
