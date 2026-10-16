# CLAUDE.md: FICSIT knowledge model

Open data model for Satisfactory game data. One LinkML schema
(`model/ficsit.linkml.yaml`) generates JSON Schema, SQL DDL, a JSON-LD context
and SHACL. `model/ofp.linkml.yaml` defines Open Factory Plan, a portable plan
format. Read `README.md` first.

## Commands

- `npm test`: JSON Schema, SHACL, and the SQL ↔ SPARQL example queries (Vitest, Node)
- `npm run lint`, `npm run typecheck`, `npm run format:check`
- `npm run build`: writes `dist/game.json`, `dist/game.sqlite`, `dist/game.ttl` and `dist/NOTICE.md`
- `npm run site`: writes `dist/site/` for GitHub Pages (after `build`)
- `npm run pack:smoke`: packs the npm package and uses it from a scratch project
- `npm run data:fetch`, `data:build`, `data:verify`: the data pipeline (`src/pipeline/`)
- `npm run data:wiki`: re-reads the Satisfactory Wiki into `data/wiki/snapshot.json` (network; review the diff)
- `npm run gen`: regenerates `model/generated/` from the schema (needs `uv`)
- `npm run ofp:validate -- plan.json`: checks an Open Factory Plan (`ofp/SPEC.md`)
- `npm run ofp:convert -- <import|export> <sft|logistics> <in> <out>`: converts plans

Done = `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` all green
(CI also runs `npm run site` and `npm run pack:smoke`).

## Rules

- `model/generated/` is **generated**: never hand-edit it. Change the YAML and
  run `npm run gen`. CI regenerates it and fails on drift.
- Each OFP validation rule has a stable code, documented in `ofp/SPEC.md` and
  covered by a fixture in `ofp/fixtures/manifest.json`.
- `data/generated/` is **generated** by `npm run data:build` from pinned sources: never
  hand-edit it (see `data/README.md`). CI rebuilds it and fails on drift.
- Every SPARQL query brackets chained arithmetic: Oxigraph 0.5.11 groups `-`
  and `/` from the right.
- Pin dependency versions exactly. LinkML is pinned in `scripts/gen.sh`.
- Units: rates are **per minute**; fluids in **m³**; power in MW; world
  coordinates in **metres** (x east, y south, so north is −y).
- Game IDs keep the game's class names (`Desc_IronPlate_C`, `Recipe_IronPlate_C`).
- Sources: public and open-source only (the Satisfactory Wiki and open-source
  repos). No game-file extraction or datamining. Attribute every source in
  `NOTICE.md`, and keep the caveat on every published artefact.
- British English in prose; game names keep the game's spelling.

## Git

- Branches: `main` ← `dev` ← `feature/*`. Open PRs into `dev`.
- Commit format: `{gitmoji} {scope}: {description}`.
- Never push `main` or `dev` directly. Merging is Nick's.
