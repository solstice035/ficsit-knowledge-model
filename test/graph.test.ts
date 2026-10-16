/**
 * Checks for the knowledge model: the input JSON validates
 * against the LinkML JSON Schema, the SQLite and RDF views agree on every
 * example query, and SHACL finds the same reference gaps as SQLite.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import Ajv2019 from 'ajv/dist/2019.js';
import { Store } from 'oxigraph';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  type GameData,
  MODEL_DIR,
  type Row,
  buildSqlite,
  buildStore,
  deriveRdf,
  deriveSql,
  foreignKeyGaps,
  loadGameData,
  runSparql,
  runSparqlText,
  runSql,
  validateShacl,
} from '../src/graph.ts';

/** References in the source data that point at nothing (see README.md). */
const KNOWN_GAPS = {
  // Build Gun recipes produce buildable descriptors that are not items.
  products: 537,
  // Schematic dependencies and unlocks that point at trimmed schematics/recipes.
  dependsOn: 104,
  unlockedRecipes: 35,
  // Geysers use the pseudo-resource `geothermal`.
  geothermal: 31,
};

let data: GameData;
let db: DatabaseSync;
let store: Store;

beforeAll(async () => {
  data = loadGameData();
  db = buildSqlite(data);
  deriveSql(db);
  store = await buildStore(data);
  deriveRdf(store);
});

/** Compares rows by position and value, ignoring column names (SQL vs SPARQL naming). */
function values(rows: Row[]): (string | number)[][] {
  return rows.map((row) => Object.values(row));
}

function expectSameRows(sqlRows: Row[], sparqlRows: Row[]) {
  expect(sparqlRows).toHaveLength(sqlRows.length);
  values(sqlRows).forEach((sqlRow, i) => {
    const sparqlRow = values(sparqlRows)[i] ?? [];
    sqlRow.forEach((value, j) => {
      if (typeof value === 'number') expect(sparqlRow[j]).toBeCloseTo(value, 9);
      else expect(sparqlRow[j]).toBe(value);
    });
  });
}

describe('JSON Schema (generated from LinkML)', () => {
  it('accepts all generated game data', () => {
    const schema = JSON.parse(readFileSync(join(MODEL_DIR, 'ficsit.schema.json'), 'utf8'));
    const ajv = new Ajv2019({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(data);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe('referential integrity', () => {
  it('SQLite reports only the known dangling references', () => {
    expect(foreignKeyGaps(db)).toEqual([
      { table: 'Product', parent: 'Item', count: KNOWN_GAPS.products },
      { table: 'ResourceNode', parent: 'Item', count: KNOWN_GAPS.geothermal },
      { table: 'Schematic_dependsOn', parent: 'Schematic', count: KNOWN_GAPS.dependsOn },
      { table: 'SchematicUnlocks_recipes', parent: 'Recipe', count: KNOWN_GAPS.unlockedRecipes },
    ]);
  });

  it('SHACL finds exactly the same gaps, and nothing else', async () => {
    const fresh = await buildStore(data); // without derived madeFrom triples
    const summary = await validateShacl(fresh);
    expect(summary.violations).toEqual({
      'ClassConstraintComponent item': KNOWN_GAPS.products,
      'ClassConstraintComponent resource': KNOWN_GAPS.geothermal,
      'ClassConstraintComponent recipes': KNOWN_GAPS.unlockedRecipes,
      'ClassConstraintComponent dependsOn': KNOWN_GAPS.dependsOn,
    });
  }, 180_000);
});

describe('example queries: SQL and SPARQL agree', () => {
  it('Q1 Heavy Modular Frame unlock path', () => {
    const sql = runSql(db, 'q1-heavy-modular-frame-unlock-path');
    expectSameRows(sql, runSparql(store, 'q1-heavy-modular-frame-unlock-path'));
    expect(sql[0]).toEqual({ item: 'Desc_ModularFrameHeavy_C', tier: 6 });
    expect(sql).toContainEqual({ item: 'Desc_SteelPipe_C', tier: 3 });
  });

  it('Q2 Wire alternates that save Copper Ore', () => {
    const sql = runSql(db, 'q2-wire-alternates-copper-ore');
    expectSameRows(sql, runSparql(store, 'q2-wire-alternates-copper-ore'));
    expect(sql.map((r) => r.recipe)).toEqual([
      'Recipe_Alternate_Wire_1_C',
      'Recipe_Alternate_Wire_2_C',
      'Recipe_Alternate_FusedWire_C',
    ]);
    expect(sql[2]?.ore_per_wire).toBeCloseTo(4 / 30, 9);
  });

  it('Q3 items that depend on Raw Quartz', () => {
    const sql = runSql(db, 'q3-depends-on-raw-quartz');
    expectSameRows(sql, runSparql(store, 'q3-depends-on-raw-quartz'));
    const items = sql.map((r) => r.item);
    expect(items).toEqual(
      expect.arrayContaining(['Desc_QuartzCrystal_C', 'Desc_Silica_C', 'Desc_CrystalOscillator_C']),
    );
    expect(items).not.toContain('Desc_IronPlate_C');
  });

  it('Q4 Manufacturer recipes by energy per item', () => {
    const sql = runSql(db, 'q4-manufacturer-energy-per-item');
    expectSameRows(sql, runSparql(store, 'q4-manufacturer-energy-per-item'));
    expect(sql).toHaveLength(37);
    expect(sql[0]).toEqual({
      recipe: 'Recipe_PlutoniumFuelRod_C',
      product: 'Desc_PlutoniumFuelRod_C',
      mj_per_item: 13_200,
    });
  });

  it('Q5 nodes within 1 km of the base that feed Steel Ingot', () => {
    const sql = runSql(db, 'q5-nodes-near-base-for-steel');
    const sparql = runSparql(store, 'q5-nodes-near-base-for-steel');
    // SPARQL returns squared distance (no sqrt in SPARQL 1.1); compare the rest.
    const withoutDistance = (rows: Row[]): Row[] =>
      rows.map(({ distance_m: _d, distanceSquared: _d2, ...rest }) => rest);
    expectSameRows(withoutDistance(sql), withoutDistance(sparql));
    sql.forEach((row, i) => {
      expect(Math.sqrt(Number(sparql[i]?.distanceSquared))).toBeCloseTo(Number(row.distance_m), 6);
    });
    expect(sql).toHaveLength(19);
    expect(sql[0]).toMatchObject({
      node: 'BP_ResourceNode115',
      resource: 'Desc_OreIron_C',
      purity: 'pure',
    });
  });
});

describe('provenance', () => {
  const records = () => [
    ...data.items,
    ...data.recipes,
    ...data.buildings,
    ...data.schematics,
    ...data.resourceNodes,
    ...data.collectibles,
  ];

  it('every record cites at least one known source', () => {
    const known = new Set(data.sources.map((s) => s.id));
    const uncited = records().filter(
      (r) => !r.derivedFrom.length || !r.derivedFrom.every((s) => known.has(s)),
    );
    expect(uncited.map((r) => r.id)).toEqual([]);
  });

  it('every source has a pinned URL, a licence and a retrieval date', () => {
    for (const s of data.sources) {
      expect(s.url).toMatch(/^https:\/\//);
      // Files are pinned to a 40-character commit SHA; wiki pages to an `oldid` revision.
      // Only the general wiki source (hand-entered facts, live categories) is unpinned.
      if (s.id.startsWith('source-wiki-r')) expect(s.url).toMatch(/[?&]oldid=\d+$/);
      else if (s.id !== 'source-satisfactory-wiki') expect(s.url).toMatch(/\/[0-9a-f]{40}\//);
      expect(s.licence).not.toBe('');
      expect(s.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('every source is cited, and the SQL and RDF views count citations alike', () => {
    const sqlCount = db
      .prepare(
        `SELECT COUNT(*) AS n FROM (${[
          'Item',
          'Recipe',
          'Building',
          'Schematic',
          'ResourceNode',
          'Collectible',
        ]
          .map((t) => `SELECT "derivedFrom_id" FROM "${t}_derivedFrom"`)
          .join(' UNION ALL ')})`,
      )
      .get() as { n: number };
    const [rdfCount] = runSparqlText(
      store,
      'SELECT (COUNT(*) AS ?n) { ?r prov:wasDerivedFrom ?s }',
    );
    expect(Number(rdfCount?.n)).toBe(sqlCount.n);
    expect(sqlCount.n).toBe(records().reduce((n, r) => n + r.derivedFrom.length, 0));
    const cited = new Set(records().flatMap((r) => r.derivedFrom));
    expect(data.sources.map((s) => s.id).filter((s) => !cited.has(s))).toEqual([]);
  });

  it('Q6 records with non-commercial facts', () => {
    const sql = runSql(db, 'q6-non-commercial-records');
    expectSameRows(sql, runSparql(store, 'q6-non-commercial-records'));
    // Every record that cites a non-commercial source: the hand-entered wiki facts, plus
    // everything carrying wiki patch history, categories or a tier phase.
    const nc = new Set(data.sources.filter((s) => s.licence.includes('NC')).map((s) => s.id));
    const expected = new Set(
      [...data.items, ...data.buildings, ...data.schematics]
        .filter((r) => r.derivedFrom.some((s) => nc.has(s)))
        .map((r) => r.id),
    );
    expect(new Set(sql.map((r) => r.record))).toEqual(expected);
    expect(expected).toContain('Build_SmelterMk1_C');
    expect(expected).toContain('Desc_HardDrive_C');
    expect(expected).toContain('Desc_IronPlate_C');
    // Docs-only records stay out.
    expect(expected).not.toContain('Recipe_IronPlate_C');
  });
});

describe('Oxigraph arithmetic', () => {
  it('still groups chained - and / from the right (remove the bracket workaround when this fails)', () => {
    const value = (expr: string) => {
      const [row] = new Store().query(`SELECT (${expr} AS ?v) {}`) as Map<
        string,
        { value: string }
      >[];
      return Number(row?.get('v')?.value);
    };
    // Standard SPARQL gives 2 and 1. Our .rq files bracket every chained operation.
    expect(value('8 - 4 - 2')).toBe(6);
    expect(value('8 / 4 / 2')).toBe(4);
  });
});
