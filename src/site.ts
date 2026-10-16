/**
 * Writes the static site for GitHub Pages (`dist/site/`), so the model's IRIs
 * resolve and the data can be browsed:
 *
 *   index.html          landing page: downloads, Datasette Lite, schemas
 *   vocab.html          every class, slot and enum (`ficsit:Recipe` → /vocab#Recipe)
 *   id/<name>.html      one page per record (`fgd:Desc_IronPlate_C` → /id/Desc_IronPlate_C)
 *   game.*, schema/*    the dumps and generated schemas, at stable URLs
 *
 * GitHub Pages serves `x.html` at `/x`, so the IRIs work without extensions.
 * Run `npm run build` first. Usage: npm run site
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL_DIR, ROOT, type GameData, loadGameData, loadMeta } from './graph.ts';
import type { HistoryEntry, ItemAmount } from './types.ts';

export const SITE_URL = 'https://solstice035.github.io/ficsit-knowledge-model/';
const REPO_URL = 'https://github.com/solstice035/ficsit-knowledge-model';

const CAVEAT =
  'Community-sourced from the Satisfactory Wiki and open-source projects; may lag game patches; ' +
  'verify in game. Not affiliated with or endorsed by Coffee Stain Studios.';

const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

function page(title: string, body: string, depth = 0): string {
  const up = '../'.repeat(depth);
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · FICSIT knowledge model</title>
<style>
:root { --bg: #fff; --fg: #1b1b1b; --muted: #5f5f5f; --line: #ddd; --link: #0b57d0; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #161616; --fg: #e8e8e8; --muted: #a8a8a8; --line: #333; --link: #8ab4f8; }
}
body { background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif;
  max-width: 60rem; margin: 0 auto; padding: 1rem; }
a { color: var(--link); }
header { border-bottom: 1px solid var(--line); margin-bottom: 1rem; }
.caveat, .muted { color: var(--muted); font-size: 0.9rem; }
table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
th, td { text-align: left; vertical-align: top; padding: 0.3rem 0.6rem 0.3rem 0;
  border-bottom: 1px solid var(--line); }
code { font-size: 0.9em; overflow-wrap: anywhere; }
</style>
</head>
<body>
<header><p><a href="${up}index.html">FICSIT knowledge model</a> · <a href="${up}vocab.html">Vocabulary</a></p></header>
<main>
${body}
</main>
<footer><p class="caveat">${esc(CAVEAT)} <a href="${up}NOTICE.md">Sources and licences</a>.</p></footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Records

interface RecordPage {
  id: string;
  kind: string;
  name: string;
  rows: [string, string][];
}

/** Builds every record page, linking references that resolve and leaving gaps as text. */
function recordPages(data: GameData): RecordPage[] {
  const names = new Map<string, string>();
  for (const list of [data.items, data.recipes, data.buildings, data.schematics, data.sources]) {
    for (const r of list) names.set(r.id, r.name || r.id);
  }
  const link = (id: string): string =>
    names.has(id)
      ? `<a href="${esc(id)}.html">${esc(names.get(id))}</a> <code>${esc(id)}</code>`
      : `<code>${esc(id)}</code>`;
  const links = (ids: string[] = []): string => ids.map(link).join('<br>') || '—';
  const amounts = (list: ItemAmount[] = []): string =>
    list.map((a) => `${esc(a.amount)} × ${link(a.item)}`).join('<br>') || '—';

  /** Wiki patch history: one block per patch, nested bullets kept as lines. */
  const history = (entries: HistoryEntry[] = []): string =>
    entries
      .map((h) => {
        const lines = [h.summary, ...(h.details?.split('\n') ?? [])].filter(Boolean);
        return `<strong>${esc(h.patch === 'unknown' ? 'Unknown patch' : `Patch ${h.patch}`)}</strong> ${lines
          .map((l) => esc(l).replace(/^( +)/, (m) => '&nbsp;'.repeat(m.length)))
          .join('<br>')}`;
      })
      .join('<br><br>') || '—';

  // Backlinks: which recipes make and use each item.
  const madeBy = new Map<string, string[]>();
  const usedIn = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, id: string) =>
    map.set(key, [...(map.get(key) ?? []), id]);
  for (const r of data.recipes) {
    for (const p of r.products) push(madeBy, p.item, r.id);
    for (const i of r.ingredients) push(usedIn, i.item, r.id);
  }
  const citedBy = new Map<string, number>();
  for (const list of [
    data.items,
    data.recipes,
    data.buildings,
    data.schematics,
    data.resourceNodes,
    data.collectibles,
  ]) {
    for (const r of list) for (const s of r.derivedFrom) citedBy.set(s, (citedBy.get(s) ?? 0) + 1);
  }

  const out: RecordPage[] = [];
  for (const i of data.items) {
    out.push({
      id: i.id,
      kind: 'Item',
      name: i.name,
      rows: [
        ['Description', esc(i.description).replace(/\n/g, '<br>')],
        ['Form', esc(i.form)],
        ['Sink points', esc(i.sinkPoints)],
        ['Energy (MJ)', esc(i.energyMJ)],
        ['Raw resource', i.isResource ? 'yes' : 'no'],
        ['Wiki categories', esc((i.wikiCategories ?? []).join(', ')) || '—'],
        ['Made by', links(madeBy.get(i.id))],
        ['Used in', links(usedIn.get(i.id))],
        ['History', history(i.history)],
        ['Sources', links(i.derivedFrom)],
      ],
    });
  }
  for (const r of data.recipes) {
    out.push({
      id: r.id,
      kind: r.alternate ? 'Alternate recipe' : 'Recipe',
      name: r.name,
      rows: [
        ['Duration (s)', esc(r.durationS)],
        ['Ingredients', amounts(r.ingredients)],
        ['Products', amounts(r.products)],
        ['Produced in', links(r.producedIn)],
        ['Craft Bench', r.handcraft ? 'yes' : 'no'],
        ['Sources', links(r.derivedFrom)],
      ],
    });
  }
  for (const b of data.buildings) {
    out.push({
      id: b.id,
      kind: 'Building',
      name: b.name,
      rows: [
        ['Category', esc(b.category)],
        ['Power (MW)', esc(b.powerMW)],
        ['Somersloop slots', esc(b.sloopSlots)],
        [
          'Footprint (m)',
          b.footprint ? esc(`${b.footprint.w} × ${b.footprint.l} × ${b.footprint.h}`) : '—',
        ],
        ['Build cost', amounts(b.buildCost)],
        ['History', history(b.history)],
        ['Sources', links(b.derivedFrom)],
      ],
    });
  }
  for (const s of data.schematics) {
    out.push({
      id: s.id,
      kind: 'Schematic',
      name: s.name,
      rows: [
        ['Type', esc(s.type)],
        ['Tier', esc(s.tier)],
        ['Phase', s.phase === undefined ? '—' : esc(s.phase)],
        ['Cost', amounts(s.cost)],
        ['Unlocks recipes', links(s.unlocks.recipes)],
        ['Depends on', links(s.dependsOn)],
        ['Sources', links(s.derivedFrom)],
      ],
    });
  }
  for (const n of data.resourceNodes) {
    out.push({
      id: n.id,
      kind: 'Resource node',
      name: n.id,
      rows: [
        ['Resource', link(n.resource)],
        ['Purity', esc(n.purity)],
        ['Type', esc(n.type)],
        ['Position (m)', esc(`x ${n.x}, y ${n.y}, z ${n.z}`)],
        ['Sources', links(n.derivedFrom)],
      ],
    });
  }
  for (const c of data.collectibles) {
    out.push({
      id: c.id,
      kind: 'Collectible',
      name: c.id,
      rows: [
        ['Type', esc(c.type)],
        ['Position (m)', esc(`x ${c.x}, y ${c.y}, z ${c.z}`)],
        ['Unlock cost', amounts(c.unlockCost)],
        ['Sources', links(c.derivedFrom)],
      ],
    });
  }
  for (const s of data.sources) {
    out.push({
      id: s.id,
      kind: 'Source',
      name: s.name,
      rows: [
        ['URL', `<a href="${esc(s.url)}"><code>${esc(s.url)}</code></a>`],
        ['Licence', esc(s.licence)],
        ['Retrieved', esc(s.retrievedAt)],
        ['Cited by', `${esc(citedBy.get(s.id) ?? 0)} records`],
      ],
    });
  }
  return out;
}

function recordHtml(r: RecordPage): string {
  const iri = `${SITE_URL}id/${r.id}`;
  const rows = r.rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`);
  return page(
    r.name,
    `<p class="muted">${esc(r.kind)}</p>
<h1>${esc(r.name)}</h1>
<p><code>${esc(iri)}</code></p>
<table>
${rows.join('\n')}
</table>`,
    1,
  );
}

// ---------------------------------------------------------------------------
// Vocabulary (from the generated JSON Schema, which carries the descriptions)

interface SchemaDef {
  description?: string;
  enum?: string[];
  properties?: { [slot: string]: { description?: string } };
}

function vocabHtml(): string {
  const schema = JSON.parse(readFileSync(join(MODEL_DIR, 'ficsit.schema.json'), 'utf8')) as {
    $defs: { [name: string]: SchemaDef };
  };
  const defs = Object.entries(schema.$defs).sort(([a], [b]) => a.localeCompare(b));
  const slots = new Map<string, { description: string; classes: string[] }>();
  for (const [name, def] of defs) {
    for (const [slot, prop] of Object.entries(def.properties ?? {})) {
      const entry = slots.get(slot) ?? { description: '', classes: [] };
      entry.description ||= prop.description ?? '';
      entry.classes.push(name);
      slots.set(slot, entry);
    }
  }
  const classes = defs
    .filter(([, d]) => !d.enum)
    .map(
      ([name, d]) =>
        `<tr id="${esc(name)}"><td><code>ficsit:${esc(name)}</code></td><td>${esc(d.description)}</td>` +
        `<td>${Object.keys(d.properties ?? {})
          .map((s) => `<a href="#${esc(s)}">${esc(s)}</a>`)
          .join(', ')}</td></tr>`,
    );
  const enums = defs
    .filter(([, d]) => d.enum)
    .map(
      ([name, d]) =>
        `<tr id="${esc(name)}"><td><code>${esc(name)}</code></td><td>${(d.enum ?? []).map((v) => `<code>${esc(v)}</code>`).join(', ')}</td></tr>`,
    );
  // Slot anchors that would clash with a class name (none today) keep the class.
  const slotRows = [...slots.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([slot]) => !schema.$defs[slot])
    .map(
      ([slot, s]) =>
        `<tr id="${esc(slot)}"><td><code>ficsit:${esc(slot)}</code></td><td>${esc(s.description)}</td>` +
        `<td>${s.classes.map((c) => `<a href="#${esc(c)}">${esc(c)}</a>`).join(', ')}</td></tr>`,
    );
  return page(
    'Vocabulary',
    `<h1>Vocabulary</h1>
<p>Terms in <code>https://solstice035.github.io/ficsit-knowledge-model/vocab#</code>, generated
from <a href="${REPO_URL}/blob/main/model/ficsit.linkml.yaml">the LinkML schema</a>. Some slots map
to standard terms instead (<code>schema:name</code>, <code>prov:wasDerivedFrom</code>,
<code>dcterms:license</code>); see the <a href="schema/ficsit.context.jsonld">JSON-LD context</a>.</p>
<h2>Classes</h2>
<table><tr><th>Class</th><th>Description</th><th>Slots</th></tr>
${classes.join('\n')}
</table>
<h2>Slots</h2>
<table><tr><th>Slot</th><th>Description</th><th>Used by</th></tr>
${slotRows.join('\n')}
</table>
<h2>Enumerations</h2>
<table><tr><th>Enum</th><th>Values</th></tr>
${enums.join('\n')}
</table>`,
  );
}

// ---------------------------------------------------------------------------
// Landing page

function indexHtml(data: GameData, records: RecordPage[]): string {
  const meta = loadMeta();
  const datasette = `https://lite.datasette.io/?url=${encodeURIComponent(`${SITE_URL}game.sqlite`)}`;
  const byKind = new Map<string, RecordPage[]>();
  for (const r of records) byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), r]);
  const browse = [...byKind.entries()]
    .filter(([kind]) => kind !== 'Resource node' && kind !== 'Collectible')
    .map(
      ([kind, list]) =>
        `<details><summary>${esc(kind)} (${list.length})</summary><p>${list
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((r) => `<a href="id/${esc(r.id)}.html">${esc(r.name)}</a>`)
          .join(' · ')}</p></details>`,
    );
  return page(
    'Home',
    `<h1>FICSIT knowledge model</h1>
<p>An open data model for <a href="https://www.satisfactorygame.com/">Satisfactory</a> game data:
one <a href="${REPO_URL}">LinkML schema</a> generates a JSON Schema, SQL tables, an RDF knowledge
graph and SHACL shapes. Data from ${esc(meta.gameVersion)}, built ${esc(meta.generatedAt)}.</p>
<p class="caveat">${esc(CAVEAT)}</p>
<h2>Explore</h2>
<ul>
<li><a href="${esc(datasette)}">Query the SQLite database in your browser</a> (Datasette Lite)</li>
<li><a href="vocab.html">Vocabulary</a>: every class and slot</li>
<li><a href="${REPO_URL}/blob/main/ofp/SPEC.md">Open Factory Plan</a>: the portable plan format</li>
</ul>
<h2>Download</h2>
<table><tr><th>File</th><th>What</th></tr>
<tr><td><a href="game.json">game.json</a></td><td>The data as JSON, with provenance on every record</td></tr>
<tr><td><a href="game.sqlite">game.sqlite</a></td><td>SQLite tables from the generated DDL</td></tr>
<tr><td><a href="game.ttl">game.ttl</a></td><td>The RDF graph (Turtle)</td></tr>
<tr><td><a href="NOTICE.md">NOTICE.md</a></td><td>Sources and licences</td></tr>
<tr><td>schema/</td><td>Generated from the LinkML schemas: ${[
      'ficsit.schema.json',
      'ficsit.sql',
      'ficsit.context.jsonld',
      'ficsit.shacl.ttl',
      'ofp.schema.json',
      'ofp.context.jsonld',
    ]
      .map((f) => `<a href="schema/${f}">${f}</a>`)
      .join(', ')}</td></tr>
</table>
<p class="muted">Identifiers: <code>${esc(SITE_URL)}id/&lt;class name&gt;</code> for data and
<code>${esc(SITE_URL)}vocab#&lt;term&gt;</code> for the vocabulary, as used in the RDF.
Sources cited: ${data.sources.map((s) => `<a href="id/${esc(s.id)}.html">${esc(s.name)}</a>`).join(', ')}.</p>
<h2>Browse</h2>
${browse.join('\n')}
<p class="muted">Resource nodes and collectibles have pages too (linked from the data), but aren't listed here.</p>`,
  );
}

// ---------------------------------------------------------------------------

/**
 * Writes the site into `outDir` (default `dist/site`) and returns the number of
 * record pages. `copyDumps: false` skips the files `npm run build` makes.
 */
export function buildSite(outDir = join(ROOT, 'dist', 'site'), { copyDumps = true } = {}): number {
  const data = loadGameData();
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'id'), { recursive: true });
  mkdirSync(join(outDir, 'schema'), { recursive: true });

  const records = recordPages(data);
  for (const r of records) writeFileSync(join(outDir, 'id', `${r.id}.html`), recordHtml(r));
  writeFileSync(join(outDir, 'vocab.html'), vocabHtml());
  writeFileSync(join(outDir, 'index.html'), indexHtml(data, records));
  // Serve files as-is (no Jekyll), so names starting with `_` survive.
  writeFileSync(join(outDir, '.nojekyll'), '');

  if (copyDumps) {
    for (const f of ['game.json', 'game.sqlite', 'game.ttl', 'NOTICE.md']) {
      copyFileSync(join(ROOT, 'dist', f), join(outDir, f));
    }
  }
  for (const f of [
    'ficsit.schema.json',
    'ficsit.sql',
    'ficsit.context.jsonld',
    'ficsit.shacl.ttl',
    'ofp.schema.json',
    'ofp.context.jsonld',
  ]) {
    copyFileSync(join(MODEL_DIR, f), join(outDir, 'schema', f));
  }
  return records.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = buildSite();
  console.log(`Wrote dist/site (${count} record pages)`);
}
