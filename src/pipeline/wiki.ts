/**
 * Parsers for Satisfactory Wiki wikitext: infobox class names, the History
 * section, and the tier → phase statements on the Milestones page. Pure
 * functions, so they are tested against small fixtures (test/wiki.test.ts).
 */
import type { HistoryEntry } from '../types.ts';

/** Wiki categories that classify an item or building; others are maintenance or too generic. */
export const WIKI_CATEGORIES: readonly string[] = [
  'Biomass',
  'Building materials',
  'Crafting components',
  'Equipment',
  'Equipment materials',
  'Flora',
  'Fluids',
  'Fuels',
  'Gases',
  'Liquids',
  'Ores',
  'Project Assembly parts',
  'Radioactive',
  'Vehicles',
];

/** One wiki page, pinned to the revision the facts were read from. */
export interface WikiPage {
  title: string;
  revid: number;
  /** ISO timestamp of that revision. */
  timestamp: string;
  classes: InfoboxClass[];
  /** Classifying categories (see WIKI_CATEGORIES) the page was in when retrieved. */
  categories: string[];
  history: HistoryEntry[];
}

/** `data/wiki/snapshot.json`, written by `npm run data:wiki` and read by `data:build`. */
export interface WikiSnapshot {
  /** Date (YYYY-MM-DD) the wiki was read. */
  retrievedAt: string;
  pages: WikiPage[];
  /** The Milestones page: which Space Elevator phase opens each tier. */
  tierPhases: { title: string; revid: number; timestamp: string; phases: Record<number, number> };
  /** Milestone names, costs and times from the same page, used by `data:verify`. */
  milestones: WikiMilestone[];
}

export interface InfoboxClass {
  kind: 'item' | 'building';
  className: string;
}

/** `{{Infobox item|className=Desc_IronPlate_C}}` and `{{Infobox building|className=…}}`. */
export function parseInfoboxClasses(wikitext: string): InfoboxClass[] {
  const found: InfoboxClass[] = [];
  const box = /\{\{\s*Infobox\s+(item|building)\s*\|([^}]*)\}\}/gi;
  for (const m of wikitext.matchAll(box)) {
    const className = /className\s*=\s*(\w+)/.exec(m[2] ?? '')?.[1];
    if (className) found.push({ kind: m[1]!.toLowerCase() as InfoboxClass['kind'], className });
  }
  return found;
}

/** Plain text from a line of wikitext: links, bold/italic, templates and refs removed. */
export function plainWikitext(text: string): string {
  return text
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<ref\b[^>]*>.*?<\/ref>/gis, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(
      /\{\{\s*(?:ItemLink|BuildingLink|Item|Building)\s*\|([^}|]*)(?:\|([^}]*))?\}\}/gi,
      (_m, a, b) => b || a,
    )
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, '')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The body of the `== History ==` section, or undefined. */
export function historySection(wikitext: string): string | undefined {
  const start = /==\s*History\s*==\s*\n/.exec(wikitext);
  if (!start) return undefined;
  const rest = wikitext.slice(start.index + start[0].length);
  const end = rest.search(/\n==[^=]/);
  return end < 0 ? rest : rest.slice(0, end);
}

const PATCH_LINE = /^\*\s*\[\[\s*Patch[_ ]([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*:?\s*(.*)$/;

/**
 * Entries of the History section: `* [[Patch 1.0]]: text`, with nested `**`
 * bullets as `details` (two spaces of indent per extra level). Lines that name
 * no patch (for example "Unknown patch before Patch 0.1: …") become `unknown`.
 */
export function parseHistory(wikitext: string): HistoryEntry[] {
  const section = historySection(wikitext);
  if (!section) return [];
  const entries: HistoryEntry[] = [];
  let current: HistoryEntry | undefined;
  for (const raw of section.split('\n')) {
    const line = raw.trimEnd();
    const patch = PATCH_LINE.exec(line);
    if (patch) {
      const summary = plainWikitext(patch[2] ?? '');
      current = { patch: patch[1]!.trim().replace(/_/g, ' '), ...(summary ? { summary } : {}) };
      entries.push(current);
      continue;
    }
    const nested = /^(\*{2,})\s*(.*)$/.exec(line);
    if (nested && current) {
      const text = plainWikitext(nested[2] ?? '');
      if (text) {
        const indent = '  '.repeat(nested[1]!.length - 2);
        current.details = current.details
          ? `${current.details}\n${indent}${text}`
          : `${indent}${text}`;
      }
      continue;
    }
    const loose = /^\*(?!\*)\s*(.+)$/.exec(line);
    if (loose) {
      const text = plainWikitext(loose[1]!);
      if (text && !/^no recorded (changes|history)/i.test(text)) {
        current = { patch: 'unknown', summary: text };
        entries.push(current);
      } else current = undefined;
    }
  }
  return entries;
}

/** One milestone from a `{{MilestoneTable}}` on the Milestones page. */
export interface WikiMilestone {
  tier: number;
  name: string;
  /** Cost as the wiki names the items. */
  cost: { item: string; amount: number }[];
  /** Research time in seconds (the wiki writes `mm:ss`). */
  timeS: number;
}

/** Reads every `{{MilestoneTable|name=…|quantity1=…|cost1=…|time=mm:ss}}` under its `== Tier N ==` heading. */
export function parseMilestones(wikitext: string): WikiMilestone[] {
  const out: WikiMilestone[] = [];
  const heading = /^==\s*Tier (\d+)\b[^=]*==\s*$/gm;
  const sections = [...wikitext.matchAll(heading)];
  sections.forEach((h, n) => {
    const end = sections[n + 1]?.index ?? wikitext.length;
    const body = wikitext.slice(h.index, end);
    for (const start of body.matchAll(/\{\{\s*MilestoneTable\b/g)) {
      let depth = 0;
      let stop = start.index;
      for (let i = start.index; i < body.length; i += 1) {
        if (body.startsWith('{{', i)) {
          depth += 1;
          i += 1;
        } else if (body.startsWith('}}', i)) {
          depth -= 1;
          i += 1;
          if (depth === 0) {
            stop = i + 1;
            break;
          }
        }
      }
      const block = body.slice(start.index, stop);
      const field = (key: string): string | undefined =>
        new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]*)`).exec(block)?.[1]?.trim();
      const name = field('name');
      const time = /^(\d+):(\d+)$/.exec(field('time') ?? '');
      if (!name || !time) continue;
      const cost: WikiMilestone['cost'] = [];
      for (let q = 1; field(`cost${q}`); q += 1) {
        cost.push({ item: field(`cost${q}`)!, amount: Number(field(`quantity${q}`)) });
      }
      out.push({
        tier: Number(h[1]),
        name,
        cost,
        timeS: Number(time[1]) * 60 + Number(time[2]),
      });
    }
  });
  return out;
}

/** "Tier 3 milestones are available starting in '''Phase 2'''." → { 3: 2 }. */
export function parseTierPhases(wikitext: string): Record<number, number> {
  const phases: Record<number, number> = {};
  for (const m of wikitext.matchAll(
    /Tier (\d+) milestones are available starting in '*Phase (\d+)'*/g,
  )) {
    phases[Number(m[1])] = Number(m[2]);
  }
  return phases;
}
