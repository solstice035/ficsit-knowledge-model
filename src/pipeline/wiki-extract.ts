/**
 * Reads the Satisfactory Wiki and writes the pinned snapshot that `data:build`
 * uses: `data/wiki/snapshot.json`. This is the only step that needs the live
 * wiki; the snapshot records each page's revision, so the build is reproducible
 * and every fact cites a permanent `oldid` URL.
 *
 * Usage: npm run data:wiki
 *
 * Reads through the public MediaWiki API with a descriptive User-Agent and a
 * short pause between requests. The wiki is CC BY-NC-SA (see NOTICE.md).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  WIKI_CATEGORIES,
  type WikiPage,
  type WikiSnapshot,
  parseHistory,
  parseInfoboxClasses,
  parseMilestones,
  parseTierPhases,
} from './wiki.ts';
import { WIKI_SNAPSHOT_DIR, WIKI_SNAPSHOT_PATH } from './sources.ts';

const API = 'https://satisfactory.wiki.gg/api.php';
const USER_AGENT =
  'ficsit-knowledge-model/0.1 (+https://github.com/solstice035/ficsit-knowledge-model; data pipeline, low volume)';
const LANGUAGE_SUBPAGE = /\/(zh|es|it|pt|pt-br|ko|ru|de|fr|cs|no|pl)(\/|$)/;
/** Categories whose pages carry an item or building infobox. */
const SOURCE_CATEGORIES = [...WIKI_CATEGORIES, 'Items', 'Buildings'];

interface ApiPage {
  title: string;
  missing?: boolean;
  categories?: { title: string }[];
  revisions?: { revid: number; timestamp: string; slots: { main: { content: string } } }[];
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function api(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Wiki API ${response.status} ${response.statusText}: ${url}`);
  await sleep(300);
  return (await response.json()) as Record<string, unknown>;
}

async function categoryMembers(category: string): Promise<string[]> {
  const titles: string[] = [];
  let cont: Record<string, string> = {};
  for (;;) {
    const result = (await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmnamespace: '0',
      cmlimit: '500',
      ...cont,
    })) as { query: { categorymembers: { title: string }[] }; continue?: Record<string, string> };
    titles.push(...result.query.categorymembers.map((m) => m.title));
    if (!result.continue) return titles;
    cont = result.continue;
  }
}

async function fetchPages(titles: string[]): Promise<ApiPage[]> {
  const pages: ApiPage[] = [];
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const byTitle = new Map<string, ApiPage>();
    let cont: Record<string, string> = {};
    for (;;) {
      const result = (await api({
        action: 'query',
        prop: 'revisions|categories',
        rvprop: 'ids|timestamp|content',
        rvslots: 'main',
        cllimit: 'max',
        redirects: '1',
        titles: batch.join('|'),
        ...cont,
      })) as { query: { pages: ApiPage[] }; continue?: Record<string, string> };
      for (const p of result.query.pages) {
        const have = byTitle.get(p.title);
        if (!have) byTitle.set(p.title, p);
        else have.categories = [...(have.categories ?? []), ...(p.categories ?? [])];
      }
      if (!result.continue) break;
      cont = result.continue;
    }
    pages.push(...byTitle.values());
  }
  return pages;
}

async function main(): Promise<void> {
  const titles = new Set<string>(['Milestones']);
  for (const category of SOURCE_CATEGORIES) {
    for (const t of await categoryMembers(category)) {
      if (!LANGUAGE_SUBPAGE.test(t) && !t.endsWith('/sandbox')) titles.add(t);
    }
    process.stdout.write(`  Category:${category}\n`);
  }
  const fetched = await fetchPages([...titles].sort());

  const pages: WikiPage[] = [];
  let tierPhases: WikiSnapshot['tierPhases'] | undefined;
  let milestones: WikiSnapshot['milestones'] = [];
  for (const p of fetched) {
    const rev = p.revisions?.[0];
    if (p.missing || !rev) continue;
    const text = rev.slots.main.content;
    const base = {
      title: p.title,
      revid: rev.revid,
      timestamp: rev.timestamp,
    };
    if (p.title === 'Milestones') {
      tierPhases = { ...base, phases: parseTierPhases(text) };
      milestones = parseMilestones(text);
      continue;
    }
    const classes = parseInfoboxClasses(text);
    if (!classes.length) continue;
    const categories = (p.categories ?? [])
      .map((c) => c.title.replace(/^Category:/, ''))
      .filter((c) => WIKI_CATEGORIES.includes(c))
      .sort();
    pages.push({ ...base, classes, categories, history: parseHistory(text) });
  }
  pages.sort((a, b) => a.title.localeCompare(b.title));
  if (!tierPhases) throw new Error('The Milestones page was not found.');

  const snapshot: WikiSnapshot = {
    retrievedAt: new Date().toISOString().slice(0, 10),
    pages,
    tierPhases,
    milestones,
  };
  mkdirSync(WIKI_SNAPSHOT_DIR, { recursive: true });
  writeFileSync(WIKI_SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 1)}\n`);
  process.stdout.write(
    `✓ ${pages.length} pages with an item or building infobox; ${Object.keys(tierPhases.phases).length} tier phases; ${milestones.length} milestones; retrieved ${snapshot.retrievedAt}\n`,
  );
}

await main();
