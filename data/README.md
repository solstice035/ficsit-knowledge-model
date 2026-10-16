# Data

`generated/` is the game data, built by the pipeline in `src/pipeline/` from
pinned upstream sources. It is committed, and **generated**: never hand-edit it.

```sh
npm run data:fetch    # download the pinned sources to data/raw/ (git-ignored), checked against sources.lock.json
npm run data:build    # parse → data/generated/*.json
npm run data:verify   # cross-check every machine recipe against SatisfactoryTools, plus world totals
```

CI runs all three and fails if `generated/` changes, so the committed data is
always what the pinned sources produce.

## Sources

Pinned by commit SHA in `src/pipeline/sources.ts`, with SHA-256 hashes in
`sources.lock.json`. `meta.json` lists them with their licences; see also
[../NOTICE.md](../NOTICE.md).

| File                              | Source                                                        | Used for                               |
| --------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| `docs-en.json`                    | Game Docs (Update 1.1) via rockfactory/satisfactory-logistics | Items, recipes, buildings, schematics  |
| `WorldResourceNodes.json`         | satisfactory-logistics (from satisfactory_node_heatmap)       | Node coordinates and purity            |
| `WorldCollectibles.json`          | satisfactory-logistics                                        | Spheres, Somersloops, drives, slugs    |
| `FactoryBuildings.json`           | satisfactory-logistics                                        | Building clearance boxes (floor plans) |
| `satisfactory-tools-data1.0.json` | greeny/SatisfactoryTools                                      | Cross-check only                       |

## Provenance

Every record in `generated/` has `derivedFrom`, the IDs of the sources its
facts come from. `meta.json` lists those sources with their pinned URLs,
licences and `retrievedAt` dates. The Satisfactory Wiki (`source-satisfactory-wiki`)
is cited by the hand-entered items, the Smelter's Somersloop override and item
`wikiCategories`; each wiki page that supplies `history` or a milestone `phase`
is its own source, `source-wiki-r<revid>`, with an `oldid` permalink.

## Wiki snapshot

`wiki/snapshot.json` is committed and **generated**: `npm run data:wiki` reads
the Satisfactory Wiki's API and records, for every page with an item or
building infobox, its revision, class names, categories and parsed History
section, plus the Milestones page (tier phases and milestone tables). The
data build and tests then need no network. Refresh it deliberately and review
the diff: `npm run data:wiki && npm run data:build && npm run data:verify`.

## Bumping a source

1. Change the SHA in `src/pipeline/sources.ts` and set `RETRIEVED_AT` to today.
2. `npm run data:fetch -- --update-lock`, then `npm run data:build` and `npm run data:verify`.
3. Explain any new difference in `verify-data.ts` (`KNOWN_DIFFERENCES`) rather than silencing it.
4. Run the full checks: the SHACL and foreign-key gap counts in `test/graph.test.ts` are pinned.

## Using your own game install

The game ships its Docs at `<Satisfactory>/CommunityResources/Docs/en-US.json`
(UTF-16). `npm run data:build -- --docs <path>` builds from that file instead.
Don't commit data built this way: it isn't reproducible from the pinned sources.

## History

The pipeline was ported from the
[FICSIT Field Guide](https://github.com/solstice035/ficsit-field-guide)
(`scripts/data/` at `dev` commit `37853ec`). The first build here reproduced
that repository's generated data byte for byte. The Field Guide can now
consume this repository's data instead.
