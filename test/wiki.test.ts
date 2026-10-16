import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/graph.ts';
import {
  WIKI_CATEGORIES,
  parseHistory,
  parseInfoboxClasses,
  parseTierPhases,
  plainWikitext,
} from '../src/pipeline/wiki.ts';

describe('wiki parsing helpers', () => {
  it('reads class names from item and building infoboxes', () => {
    const text = `{{Infobox item|className=Desc_IronPlate_C}}
text
{{Infobox building|className=Desc_ConstructorMk1_C
| overclockable = 1
| size_width = 8
}}`;
    expect(parseInfoboxClasses(text)).toEqual([
      { kind: 'item', className: 'Desc_IronPlate_C' },
      { kind: 'building', className: 'Desc_ConstructorMk1_C' },
    ]);
  });

  it('ignores infoboxes without a class name', () => {
    expect(parseInfoboxClasses('{{Infobox simple|researchTier = x}}')).toEqual([]);
    expect(parseInfoboxClasses('{{Infobox life|className=Char_Hog_C}}')).toEqual([]);
  });

  it('strips wikitext markup to plain text', () => {
    expect(plainWikitext("Fixed [[Hard Drive|drives]] in the [[MAM]] with '''bold''' text")).toBe(
      'Fixed drives in the MAM with bold text',
    );
    expect(
      plainWikitext('Added {{ItemLink|Iron Plate}}<ref name="x">cite</ref> and {{Foo|bar}}'),
    ).toBe('Added Iron Plate and');
    expect(plainWikitext('See [https://example.org/x the page]')).toBe('See the page');
  });

  const history = `== Obtaining ==
text

== History ==
{{HistoryMissing|incomplete}}

* [[Patch 1.0]]:
** Introduced Steel Cast Plate recipe
** Coated Iron Plate
*** Changed recipe craft time from 12 to 8 seconds
* [[Patch 0.4.0.0]]: Increased stack size from 100 to 200
* [[Patch_0.3.3.0#Balancing|Patch 0.3.3.0]]: Point values were re-balanced
* Unknown patch before [[Patch 0.1]]: No longer possible to mine by hand
* No recorded history

{{ItemNav}}

[[Category:Items]]`;

  it('parses the History section with nested details', () => {
    expect(parseHistory(history)).toEqual([
      {
        patch: '1.0',
        details:
          'Introduced Steel Cast Plate recipe\nCoated Iron Plate\n  Changed recipe craft time from 12 to 8 seconds',
      },
      { patch: '0.4.0.0', summary: 'Increased stack size from 100 to 200' },
      { patch: '0.3.3.0', summary: 'Point values were re-balanced' },
      {
        patch: 'unknown',
        summary: 'Unknown patch before Patch 0.1: No longer possible to mine by hand',
      },
    ]);
  });

  it('returns nothing when there is no History section', () => {
    expect(parseHistory('== Obtaining ==\ntext')).toEqual([]);
  });

  it('reads which phase opens each tier', () => {
    const text = `== Tier 1 ==
Tier 1 milestones are available starting in '''Phase 1'''.
== Tier 3 ==
Tier 3 milestones are available starting in '''Phase 2'''.`;
    expect(parseTierPhases(text)).toEqual({ 1: 1, 3: 2 });
  });
});

describe('wiki facts in the generated data', () => {
  const data = loadGameData();
  const sourceIds = new Set(data.sources.map((s) => s.id));
  const item = (id: string) => data.items.find((i) => i.id === id);

  it('gives Iron Plate its patch history and categories', () => {
    const plate = item('Desc_IronPlate_C');
    expect(plate?.history?.find((h) => h.patch === '0.4.0.0')?.summary).toBe(
      'Increased stack size from 100 to 200',
    );
    expect(plate?.wikiCategories).toEqual(
      expect.arrayContaining(['Crafting components', 'Building materials']),
    );
  });

  it('only uses categories from the allow-list', () => {
    for (const i of data.items) {
      for (const c of i.wikiCategories ?? []) expect(WIKI_CATEGORIES).toContain(c);
    }
  });

  it('covers every building with a history', () => {
    expect(data.buildings.filter((b) => !b.history?.length).map((b) => b.id)).toEqual([]);
  });

  it('opens each milestone tier in the right Space Elevator phase', () => {
    const milestones = data.schematics.filter((s) => s.type === 'milestone');
    expect(milestones.filter((s) => s.phase === undefined).map((s) => s.id)).toEqual([]);
    const phaseOf = (tier: number) =>
      new Set(milestones.filter((s) => s.tier === tier).map((s) => s.phase));
    expect(phaseOf(1)).toEqual(new Set([1]));
    expect(phaseOf(3)).toEqual(new Set([2]));
    expect(phaseOf(9)).toEqual(new Set([5]));
    expect(data.schematics.filter((s) => s.type !== 'milestone' && s.phase !== undefined)).toEqual(
      [],
    );
  });

  it('cites a revision-pinned wiki page for every record with history or a phase', () => {
    const records = [...data.items, ...data.buildings, ...data.schematics];
    for (const r of records) {
      const hasWikiFact =
        ('history' in r && r.history?.length) || ('phase' in r && r.phase !== undefined);
      if (!hasWikiFact) continue;
      expect(r.derivedFrom.some((s) => /^source-wiki-r\d+$/.test(s) && sourceIds.has(s))).toBe(
        true,
      );
    }
  });

  it('keeps history entries well formed', () => {
    for (const r of [...data.items, ...data.buildings]) {
      for (const h of r.history ?? []) {
        expect(h.patch).not.toBe('');
        expect(h.summary || h.details).toBeTruthy();
      }
    }
  });
});
