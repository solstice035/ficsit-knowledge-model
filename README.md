# FICSIT knowledge model

An open data model for [Satisfactory](https://www.satisfactorygame.com/) game
data. One [LinkML](https://linkml.io) schema generates every view of the same
data:

- a **JSON Schema** that validates the data as plain JSON
- **SQL tables**, built into a SQLite database
- a **JSON-LD context** that turns the same JSON into an **RDF knowledge graph**
- **SHACL shapes** that validate the graph

It started as a spike for the [FICSIT Field Guide](https://github.com/solstice035/ficsit-field-guide)
and is the foundation for **Open Factory Plan**, a portable plan format so
factory plans can move between Satisfactory tools.

> Community-sourced from the Satisfactory Wiki and open-source projects; may lag
> game patches; verify in game. Not affiliated with or endorsed by Coffee Stain
> Studios. See [NOTICE.md](NOTICE.md) for sources and licences.

## Quick start

Needs Node 22.22 or later. Regenerating the model also needs
[uv](https://docs.astral.sh/uv/).

```sh
npm install
npm test        # JSON Schema, SHACL and the SQL ↔ SPARQL example queries
npm run build   # dist/game.sqlite, dist/game.ttl, dist/NOTICE.md
npm run gen     # regenerate model/generated/ from the LinkML schema (needs uv)
npm run site    # dist/site: the static site for GitHub Pages (after npm run build)
```

## How it fits together

```
model/ficsit.linkml.yaml               ← single source of truth (LinkML)
  │  npm run gen  (pinned LinkML 1.12.0)
  ├── generated/ficsit.schema.json     JSON Schema: validates data/generated/*.json
  ├── generated/ficsit.sql             SQL DDL: tables for game.sqlite
  ├── generated/ficsit.context.jsonld  JSON-LD context: turns the same JSON into RDF
  └── generated/ficsit.shacl.ttl       SHACL shapes: validates the RDF

model/ofp.linkml.yaml                  ← Open Factory Plan (ofp/SPEC.md)
  ├── generated/ofp.schema.json        JSON Schema for plans
  └── generated/ofp.context.jsonld     JSON-LD context: plans as RDF

pinned sources  ──  npm run data:fetch, data:build  ──►  data/generated/*.json

data/generated/*.json    ──  npm run build  ──►  dist/game.json
                                                 dist/game.sqlite
                                                 dist/game.ttl
                                                 dist/NOTICE.md
                             npm run site   ──►  dist/site/ (GitHub Pages)
```

- `model/generated/` is committed and **generated**: never hand-edit it. Change
  the YAML and run `npm run gen`. CI regenerates it and fails on drift.
- `data/generated/` is built from pinned upstream sources by `src/pipeline/`
  and is generated too (see [data/README.md](data/README.md)).
- `dist/` is a git-ignored build output.

## Identifiers

| Kind                   | IRI                                                                         |
| ---------------------- | --------------------------------------------------------------------------- |
| Vocabulary (`ficsit:`) | `https://solstice035.github.io/ficsit-knowledge-model/vocab#`               |
| Data (`fgd:`)          | `https://solstice035.github.io/ficsit-knowledge-model/id/<game class name>` |

Data IRIs keep the game's class names, so `fgd:Desc_IronPlate_C` is Iron Plate.
Every Satisfactory tool already uses these names, which is what makes the data
linkable across tools. Once GitHub Pages is on, every data IRI resolves to a
page and every vocabulary term to an anchor (see [Package and site](#package-and-site)).

## Example queries

`model/queries/` holds six questions, each written in SQL (`.sql`) and SPARQL
(`.rq`). `test/graph.test.ts` runs both and checks they agree.

| Query | Question                                                                             |
| ----- | ------------------------------------------------------------------------------------ |
| Q1    | Every item in the standard Heavy Modular Frame chain, and the earliest tier for each |
| Q2    | Wire alternates that use less Copper Ore than the standard recipe                    |
| Q3    | Every item that transitively depends on Raw Quartz                                   |
| Q4    | Manufacturer recipes ranked by energy per item (all draw 55 MW, so MW alone is flat) |
| Q5    | Nodes within 1 km of a base at (-1,640 m, -330 m) that feed the Steel Ingot chain    |
| Q6    | Records with facts from a non-commercial (CC BY-NC) source                           |

Both views first add the same derived relation, `madeFrom` (`derive.sql` /
`derive.ru`): product made from ingredient, over standard machine recipes, with
raw resources as leaves.

Units: rates per minute, fluids in m³, power in MW, durations in seconds, world
coordinates in metres (x east, y south; north is −y).

## Open Factory Plan

[`ofp/SPEC.md`](ofp/SPEC.md) defines **Open Factory Plan v0** (draft), a
portable JSON format for factory plans: factories with inputs, outputs and
production lines, using the same IDs and units as the game data. Its LinkML
schema (`model/ofp.linkml.yaml`) generates a JSON Schema and a JSON-LD context,
so a plan's RDF joins the game graph.

```sh
npm run ofp:validate -- my-plan.ofp.json   # schema + rules against the game data
```

`ofp/fixtures/` holds conformance fixtures, with the expected issue codes in
`manifest.json`.

### Converters

`src/interop/` converts plans to and from two open-source planners. Both use
the same game class names, so items and recipes map directly. Each conversion
returns notes on anything the target format can't hold.

| Planner                                                                         | Format                               | Import                                              | Export                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [SatisfactoryTools](https://github.com/greeny/SatisfactoryTools)                | `.sft` export (production tabs)      | Each tab becomes a targets-only factory             | Each factory becomes a tab; world raw inputs become resource limits; used alternates are allowed |
| [satisfactory-logistics](https://github.com/rockfactory/satisfactory-logistics) | Factory export or game backup (JSON) | Factories, world inputs and links between factories | A game backup; each solver is limited to the plan's recipes                                      |

```sh
npm run ofp:convert -- import sft plans.sft plan.ofp.json
npm run ofp:convert -- export logistics plan.ofp.json backup.json
```

Neither format stores production lines the way OFP does (both re-solve), so
lines travel as targets plus recipe choices.

## Package and site

**npm package.** `npm pack` builds an ES-module package (`prepack` runs the
build and compiles `lib/`). It exports `loadGameData()`, `validatePlan()`,
`planToJsonLd()` and the types, plus the data and schemas as files:

```js
import { loadGameData, validatePlan } from 'ficsit-knowledge-model';
import schema from 'ficsit-knowledge-model/schema/ofp.schema.json' with { type: 'json' };
// Also: ficsit-knowledge-model/game.json, /game.sqlite, /game.ttl, /schema/ficsit.*
```

`npm run pack:smoke` (run in CI) installs the packed tarball into a scratch
project and uses it. The package is still `"private": true`: publishing it is
a release decision.

**Site.** `.github/workflows/pages.yml` publishes `dist/site/` from `main`:
downloads of the dumps and schemas at stable URLs, a
[Datasette Lite](https://lite.datasette.io/) link for SQL in the browser, the
vocabulary at `/vocab`, and one page per record at `/id/<class name>`, with
links, "made by" and "used in" backlinks, and provenance. It needs Pages
turned on, with "GitHub Actions" as the source.

## Provenance

Every record (item, recipe, building, schematic, resource node, collectible)
has a required `derivedFrom` list naming the sources its facts come from
(`prov:wasDerivedFrom` in RDF, `<Class>_derivedFrom` tables in SQLite). Each
`Source` has an ID, a name, a pinned URL, a licence and a retrieval date.

| Source ID                     | Cited by                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `source-docs-en`              | Items, recipes, buildings, schematics                                                                            |
| `source-factory-buildings`    | Buildings with a clearance box (`footprint`)                                                                     |
| `source-world-resource-nodes` | Resource nodes, wells and geysers                                                                                |
| `source-world-collectibles`   | Collectibles                                                                                                     |
| `source-satisfactory-wiki`    | Hard Drive and FICSIT Coupon items; the Smelter's sloop slots; item `wikiCategories` (the live category listing) |
| `source-wiki-r<revid>`        | One per wiki page: `history` on items and buildings, `phase` on milestones. The URL is an `oldid` permalink      |

The data pipeline writes `derivedFrom` on every record as it builds
`data/generated/`, and lists the cited sources in `meta.json`. File sources are
pinned to a commit SHA and their bytes to a SHA-256 in `data/sources.lock.json`.
`retrievedAt` is the pinned `RETRIEVED_AT` date in `src/pipeline/sources.ts`.

Wiki facts that come from a page are pinned to its revision: `npm run data:wiki`
reads the wiki and writes `data/wiki/snapshot.json` (page, revision, infobox
class names, categories, History section, tier phases and milestone tables),
and `data:build` reads only that committed snapshot, so a rebuild needs no
network. Facts from the wiki's live category listing and the hand-entered
items still cite `source-satisfactory-wiki`, which is not pinned.

## Wiki-derived fields

| Field            | On             | Meaning                                                                                              |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `history`        | Item, Building | Patch-by-patch changes (`patch`, `summary`, `details`) from the page's History section, newest first |
| `wikiCategories` | Item           | Classifying wiki categories such as `Crafting components`, `Fuels` or `Project Assembly parts`       |
| `phase`          | Schematic      | Space Elevator phase that opens a milestone's tier (Milestones page)                                 |

These are CC BY-NC-SA: any reuse must be non-commercial and share-alike
(query Q6 lists every record that carries them). `data:verify` also checks all
42 tier 1-9 milestones against the wiki's tables: names, costs and research
times agree.

## Known data gaps

SQLite's foreign-key check and SHACL independently report the same dangling
references, and nothing else. The counts are pinned in the tests, so any new gap
fails CI.

| Gap                         | Count | Cause                                                               |
| --------------------------- | ----- | ------------------------------------------------------------------- |
| Recipe product → Item       | 537   | Build Gun recipes produce buildable descriptors, which aren't items |
| Schematic → dependsOn       | 104   | Points at schematics the input build trims out                      |
| Schematic → unlocked recipe | 35    | Points at recipes the input build trims out                         |
| Resource node → Item        | 31    | Geysers use the pseudo-resource `geothermal`                        |

## Design notes

- **`Ingredient` and `Product` subclasses.** `gen-sqlddl` otherwise stores both
  in one `ItemAmount` table with no role column. The JSON is unchanged.
- **Inlining is set per class** with `slot_usage`. A slot inlined in one class
  and referenced in another otherwise confuses `gen-shacl`.
- **Source URLs are IRIs.** `gen-jsonld-context` types `uri` slots as
  `xsd:anyURI` literals but `gen-shacl` expects IRIs, so the build emits
  `schema:url` as an IRI.
- **Numbers are `double`.** `xsd:float` is 32-bit in SPARQL engines and loses
  precision on world coordinates.
- **Oxigraph 0.5.11 arithmetic.** It groups chained `-` and `/` from the right
  (`8 - 4 - 2` = 6). Every `.rq` file brackets chained arithmetic, and a test
  fails once upstream fixes it so the workaround can be dropped.
- **Tooling.** LinkML is Python, so only regeneration needs `uv`. Building and
  testing are pure Node: `node:sqlite` (built in), `jsonld`, `oxigraph` (WASM)
  and `rdf-validate-shacl`.

## Roadmap

1. ~~Provenance on every record (source, pinned URL, retrieval date, licence).~~
   Done; see [Provenance](#provenance).
2. ~~Open Factory Plan v0: a plan schema, validator and conformance fixtures.~~
   Done (draft); see [Open Factory Plan](#open-factory-plan).
3. ~~Move the data pipeline here, so the Field Guide consumes this repository.~~
   Done; see [data/README.md](data/README.md).
4. Publish an npm package and browsable data (Datasette Lite), plus the RDF
   dump at stable URLs. Built (see [Package and site](#package-and-site));
   publishing to npm and turning on Pages are still to do.
5. ~~Importers and exporters for other open-source planners.~~ First two done
   (SatisfactoryTools, satisfactory-logistics); see [Converters](#converters).

## Contributing

Branches are `main` ← `dev` ← `feature/*`; open pull requests into `dev`. See
[CLAUDE.md](CLAUDE.md) for commands and repository rules.

## Licence

Code, schema and queries: [MIT](LICENSE). Game data has its own licences; see
[NOTICE.md](NOTICE.md).
