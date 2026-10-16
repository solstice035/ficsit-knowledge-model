# Notices: data sources and licences

The **code, schema, generated schemas and queries** in this repository are MIT
(see [LICENSE](LICENSE)).

The **game data** in `data/` and in the built bundles (`dist/`) is not ours and is
not covered by the MIT licence:

| Source                                                                                                                         | Licence                | What we use                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Satisfactory game data (the game's `Docs` JSON, as mirrored by open-source projects)                                           | © Coffee Stain Studios | Items, recipes, buildings, schematics                                                                                        |
| [rockfactory/satisfactory-logistics](https://github.com/rockfactory/satisfactory-logistics)                                    | MIT                    | Docs mirror, resource nodes, collectibles, building clearance boxes                                                          |
| [Hirashi3630/satisfactory_node_heatmap](https://github.com/Hirashi3630/satisfactory_node_heatmap) (via satisfactory-logistics) | MIT                    | Resource node coordinates and purity                                                                                         |
| [greeny/SatisfactoryTools](https://github.com/greeny/SatisfactoryTools)                                                        | MIT                    | Cross-check of every recipe                                                                                                  |
| [Satisfactory Wiki](https://satisfactory.wiki.gg/)                                                                             | CC BY-NC-SA            | Facts not in the Docs: Space Elevator costs, per-item and per-building patch history, item categories, milestone tier phases |

Facts derived from the Satisfactory Wiki are CC BY-NC-SA: any reuse of those
parts must be non-commercial, share-alike and credit the wiki. The `history`
entries are the wiki contributors' wording of the patch notes, reduced to plain
text; each cites the page and the exact revision it was read from. Pages are
read through the wiki's public API (`npm run data:wiki`) with a descriptive
User-Agent at a low rate. Its `robots.txt` allows search and reference use and
forbids AI training; this data is not used for training.

We use public and open-source sources only. We do not extract or datamine game
files.

> Community-sourced; may lag game patches; verify in game. This project is not
> affiliated with or endorsed by Coffee Stain Studios. Satisfactory is a
> trademark of Coffee Stain Studios.
