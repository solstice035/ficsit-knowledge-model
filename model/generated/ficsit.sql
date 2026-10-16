-- # Class: GameData Description: Container for one generated game-data bundle.
--     * Slot: id
-- # Class: Item Description: An item, fluid or gas (`Desc_*_C`).
--     * Slot: id Description: The game's class name, e.g. `Desc_IronPlate_C`.
--     * Slot: name
--     * Slot: description
--     * Slot: form
--     * Slot: sinkPoints Description: AWESOME Sink points per item (0 if unsinkable).
--     * Slot: energyMJ Description: Energy per item, or per m³ for fluids (0 if not a fuel).
--     * Slot: radioactive
--     * Slot: isResource Description: Raw resource extracted from the world.
--     * Slot: GameData_id Description: Autocreated FK slot
-- # Class: ItemAmount Description: A quantity of one item, used for ingredients, products and costs.
--     * Slot: id
--     * Slot: item
--     * Slot: amount Description: Item count, or m³ for fluids.
--     * Slot: Building_id Description: Autocreated FK slot
--     * Slot: Schematic_id Description: Autocreated FK slot
--     * Slot: Collectible_id Description: Autocreated FK slot
-- # Class: Ingredient Description: An input to a recipe. A distinct class (not just ItemAmount) so the relational and graph views keep ingredients and products apart.
--     * Slot: id
--     * Slot: item
--     * Slot: amount Description: Item count, or m³ for fluids.
--     * Slot: Recipe_id Description: Autocreated FK slot
-- # Class: Product Description: An output of a recipe.
--     * Slot: id
--     * Slot: item
--     * Slot: amount Description: Item count, or m³ for fluids.
--     * Slot: Recipe_id Description: Autocreated FK slot
-- # Class: Recipe Description: A recipe (`Recipe_*_C`). Fluid amounts are in m³.
--     * Slot: id Description: The game's class name, e.g. `Desc_IronPlate_C`.
--     * Slot: name
--     * Slot: alternate
--     * Slot: durationS
--     * Slot: handcraft
--     * Slot: buildGun
--     * Slot: workshop
--     * Slot: GameData_id Description: Autocreated FK slot
--     * Slot: variablePower_id
-- # Class: VariablePower
--     * Slot: id
--     * Slot: minMW
--     * Slot: maxMW
-- # Class: HistoryEntry Description: One patch's change to an item or building, as the Satisfactory Wiki's History section words it. The wiki is CC BY-NC-SA: any reuse must be non-commercial and share-alike (see NOTICE.md).
--     * Slot: id
--     * Slot: patch Description: Patch ID such as `1.0`, `0.3.4.6` or `Closed Alpha 3`; `unknown` when the wiki names none.
--     * Slot: summary Description: The change, as the wiki words it (plain text).
--     * Slot: details Description: Nested bullets, one per line, two spaces of indent per extra level.
--     * Slot: Item_id Description: Autocreated FK slot
--     * Slot: Building_id Description: Autocreated FK slot
-- # Class: Building Description: A factory, extractor, generator or logistics building (`Build_*_C`).
--     * Slot: id Description: The game's class name, e.g. `Desc_IronPlate_C`.
--     * Slot: name
--     * Slot: category
--     * Slot: powerMW
--     * Slot: powerExponent
--     * Slot: sloopSlots
--     * Slot: beltRate
--     * Slot: pipeRate
--     * Slot: GameData_id Description: Autocreated FK slot
--     * Slot: footprint_id
--     * Slot: extractor_id
--     * Slot: generator_id
--     * Slot: variablePower_id
-- # Class: Footprint Description: Clearance box in metres.
--     * Slot: id
--     * Slot: w
--     * Slot: l
--     * Slot: h
-- # Class: ExtractorSpec
--     * Slot: id
--     * Slot: baseRatePerMin
-- # Class: GeneratorSpec
--     * Slot: id
--     * Slot: powerMW
--     * Slot: supplementalPerMW
-- # Class: GeneratorFuel
--     * Slot: id
--     * Slot: item
--     * Slot: supplemental
--     * Slot: GeneratorSpec_id Description: Autocreated FK slot
--     * Slot: byproduct_id
-- # Class: Schematic Description: A milestone, MAM node, alternate or other unlock (`Schematic_*_C`).
--     * Slot: id Description: The game's class name, e.g. `Desc_IronPlate_C`.
--     * Slot: name
--     * Slot: type Description: Kind of schematic, node or collectible (range set per class).
--     * Slot: tier
--     * Slot: phase Description: Space Elevator phase in which this milestone's tier opens (Satisfactory Wiki, Milestones). Absent for schematics that are not tier milestones.
--     * Slot: timeS
--     * Slot: mamTree
--     * Slot: GameData_id Description: Autocreated FK slot
--     * Slot: unlocks_id
-- # Class: SchematicUnlocks
--     * Slot: id
--     * Slot: inventorySlots
--     * Slot: armSlots
-- # Class: ResourceNode Description: A resource node, well or geyser in the world. `resource` is an item ID, or `geothermal` for geysers.
--     * Slot: id Description: The game's class name, e.g. `Desc_IronPlate_C`.
--     * Slot: resource Description: Item ID of the resource, or `geothermal` for geysers.
--     * Slot: purity
--     * Slot: type Description: Kind of schematic, node or collectible (range set per class).
--     * Slot: x
--     * Slot: y
--     * Slot: z
--     * Slot: GameData_id Description: Autocreated FK slot
-- # Class: Collectible Description: A Mercer Sphere, Somersloop, Hard Drive crash site or Power Slug.
--     * Slot: id Description: The game's class name, e.g. `Desc_IronPlate_C`.
--     * Slot: type Description: Kind of schematic, node or collectible (range set per class).
--     * Slot: x
--     * Slot: y
--     * Slot: z
--     * Slot: GameData_id Description: Autocreated FK slot
-- # Class: Source Description: A pinned upstream source that records are derived from. The URL pins an exact revision, so the content behind it does not change.
--     * Slot: id Description: Stable source ID, e.g. `source-docs-en`.
--     * Slot: name
--     * Slot: url Description: Pinned URL of the source (a commit-pinned file, or a wiki page).
--     * Slot: licence Description: Licence of the source, as stated by its publisher.
--     * Slot: retrievedAt Description: Date the input bundle was built from this source.
--     * Slot: GameData_id Description: Autocreated FK slot
-- # Class: Item_wikiCategories
--     * Slot: Item_id Description: Autocreated FK slot
--     * Slot: wikiCategories Description: Satisfactory Wiki categories that classify the item (for example `Crafting components`).
-- # Class: Item_derivedFrom
--     * Slot: Item_id Description: Autocreated FK slot
--     * Slot: derivedFrom_id Description: Sources this record's facts come from.
-- # Class: Recipe_producedIn
--     * Slot: Recipe_id Description: Autocreated FK slot
--     * Slot: producedIn_id Description: Factory buildings that can run this recipe.
-- # Class: Recipe_derivedFrom
--     * Slot: Recipe_id Description: Autocreated FK slot
--     * Slot: derivedFrom_id Description: Sources this record's facts come from.
-- # Class: Building_derivedFrom
--     * Slot: Building_id Description: Autocreated FK slot
--     * Slot: derivedFrom_id Description: Sources this record's facts come from.
-- # Class: ExtractorSpec_resources
--     * Slot: ExtractorSpec_id Description: Autocreated FK slot
--     * Slot: resources_id
-- # Class: Schematic_dependsOn
--     * Slot: Schematic_id Description: Autocreated FK slot
--     * Slot: dependsOn_id
-- # Class: Schematic_derivedFrom
--     * Slot: Schematic_id Description: Autocreated FK slot
--     * Slot: derivedFrom_id Description: Sources this record's facts come from.
-- # Class: SchematicUnlocks_recipes
--     * Slot: SchematicUnlocks_id Description: Autocreated FK slot
--     * Slot: recipes_id Description: Recipes this schematic unlocks (references).
-- # Class: SchematicUnlocks_schematics
--     * Slot: SchematicUnlocks_id Description: Autocreated FK slot
--     * Slot: schematics_id Description: Schematics this schematic unlocks (references).
-- # Class: SchematicUnlocks_scannerResources
--     * Slot: SchematicUnlocks_id Description: Autocreated FK slot
--     * Slot: scannerResources
-- # Class: SchematicUnlocks_scannerObjects
--     * Slot: SchematicUnlocks_id Description: Autocreated FK slot
--     * Slot: scannerObjects
-- # Class: ResourceNode_derivedFrom
--     * Slot: ResourceNode_id Description: Autocreated FK slot
--     * Slot: derivedFrom_id Description: Sources this record's facts come from.
-- # Class: Collectible_derivedFrom
--     * Slot: Collectible_id Description: Autocreated FK slot
--     * Slot: derivedFrom_id Description: Sources this record's facts come from.

CREATE TABLE "GameData" (
	id INTEGER NOT NULL,
	PRIMARY KEY (id)
);
CREATE INDEX "ix_GameData_id" ON "GameData" (id);

CREATE TABLE "VariablePower" (
	id INTEGER NOT NULL,
	"minMW" FLOAT,
	"maxMW" FLOAT,
	PRIMARY KEY (id)
);
CREATE INDEX "ix_VariablePower_id" ON "VariablePower" (id);

CREATE TABLE "Footprint" (
	id INTEGER NOT NULL,
	w FLOAT,
	l FLOAT,
	h FLOAT,
	PRIMARY KEY (id)
);
CREATE INDEX "ix_Footprint_id" ON "Footprint" (id);

CREATE TABLE "ExtractorSpec" (
	id INTEGER NOT NULL,
	"baseRatePerMin" FLOAT,
	PRIMARY KEY (id)
);
CREATE INDEX "ix_ExtractorSpec_id" ON "ExtractorSpec" (id);

CREATE TABLE "GeneratorSpec" (
	id INTEGER NOT NULL,
	"powerMW" FLOAT,
	"supplementalPerMW" FLOAT,
	PRIMARY KEY (id)
);
CREATE INDEX "ix_GeneratorSpec_id" ON "GeneratorSpec" (id);

CREATE TABLE "SchematicUnlocks" (
	id INTEGER NOT NULL,
	"inventorySlots" INTEGER,
	"armSlots" INTEGER,
	PRIMARY KEY (id)
);
CREATE INDEX "ix_SchematicUnlocks_id" ON "SchematicUnlocks" (id);

CREATE TABLE "Item" (
	id TEXT NOT NULL,
	name TEXT,
	description TEXT,
	form VARCHAR(6) NOT NULL,
	"sinkPoints" INTEGER,
	"energyMJ" FLOAT,
	radioactive BOOLEAN,
	"isResource" BOOLEAN,
	"GameData_id" INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY("GameData_id") REFERENCES "GameData" (id)
);
CREATE INDEX "ix_Item_id" ON "Item" (id);

CREATE TABLE "Recipe" (
	id TEXT NOT NULL,
	name TEXT,
	alternate BOOLEAN NOT NULL,
	"durationS" FLOAT NOT NULL,
	handcraft BOOLEAN,
	"buildGun" BOOLEAN,
	workshop BOOLEAN,
	"GameData_id" INTEGER,
	"variablePower_id" INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY("GameData_id") REFERENCES "GameData" (id),
	FOREIGN KEY("variablePower_id") REFERENCES "VariablePower" (id)
);
CREATE INDEX "ix_Recipe_id" ON "Recipe" (id);

CREATE TABLE "Building" (
	id TEXT NOT NULL,
	name TEXT,
	category VARCHAR(10) NOT NULL,
	"powerMW" FLOAT,
	"powerExponent" FLOAT,
	"sloopSlots" INTEGER,
	"beltRate" FLOAT,
	"pipeRate" FLOAT,
	"GameData_id" INTEGER,
	footprint_id INTEGER,
	extractor_id INTEGER,
	generator_id INTEGER,
	"variablePower_id" INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY("GameData_id") REFERENCES "GameData" (id),
	FOREIGN KEY(footprint_id) REFERENCES "Footprint" (id),
	FOREIGN KEY(extractor_id) REFERENCES "ExtractorSpec" (id),
	FOREIGN KEY(generator_id) REFERENCES "GeneratorSpec" (id),
	FOREIGN KEY("variablePower_id") REFERENCES "VariablePower" (id)
);
CREATE INDEX "ix_Building_id" ON "Building" (id);

CREATE TABLE "Schematic" (
	id TEXT NOT NULL,
	name TEXT,
	type VARCHAR(13) NOT NULL,
	tier INTEGER NOT NULL,
	phase INTEGER,
	"timeS" FLOAT,
	"mamTree" TEXT,
	"GameData_id" INTEGER,
	unlocks_id INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY("GameData_id") REFERENCES "GameData" (id),
	FOREIGN KEY(unlocks_id) REFERENCES "SchematicUnlocks" (id)
);
CREATE INDEX "ix_Schematic_id" ON "Schematic" (id);

CREATE TABLE "Collectible" (
	id TEXT NOT NULL,
	type VARCHAR(12) NOT NULL,
	x FLOAT NOT NULL,
	y FLOAT NOT NULL,
	z FLOAT NOT NULL,
	"GameData_id" INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY("GameData_id") REFERENCES "GameData" (id)
);
CREATE INDEX "ix_Collectible_id" ON "Collectible" (id);

CREATE TABLE "Source" (
	id TEXT NOT NULL,
	name TEXT NOT NULL,
	url TEXT NOT NULL,
	licence TEXT NOT NULL,
	"retrievedAt" DATE NOT NULL,
	"GameData_id" INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY("GameData_id") REFERENCES "GameData" (id)
);
CREATE INDEX "ix_Source_id" ON "Source" (id);

CREATE TABLE "SchematicUnlocks_scannerResources" (
	"SchematicUnlocks_id" INTEGER,
	"scannerResources" TEXT,
	PRIMARY KEY ("SchematicUnlocks_id", "scannerResources"),
	FOREIGN KEY("SchematicUnlocks_id") REFERENCES "SchematicUnlocks" (id)
);
CREATE INDEX "ix_SchematicUnlocks_scannerResources_SchematicUnlocks_id" ON "SchematicUnlocks_scannerResources" ("SchematicUnlocks_id");
CREATE INDEX "ix_SchematicUnlocks_scannerResources_scannerResources" ON "SchematicUnlocks_scannerResources" ("scannerResources");

CREATE TABLE "SchematicUnlocks_scannerObjects" (
	"SchematicUnlocks_id" INTEGER,
	"scannerObjects" TEXT,
	PRIMARY KEY ("SchematicUnlocks_id", "scannerObjects"),
	FOREIGN KEY("SchematicUnlocks_id") REFERENCES "SchematicUnlocks" (id)
);
CREATE INDEX "ix_SchematicUnlocks_scannerObjects_SchematicUnlocks_id" ON "SchematicUnlocks_scannerObjects" ("SchematicUnlocks_id");
CREATE INDEX "ix_SchematicUnlocks_scannerObjects_scannerObjects" ON "SchematicUnlocks_scannerObjects" ("scannerObjects");

CREATE TABLE "ItemAmount" (
	id INTEGER NOT NULL,
	item TEXT NOT NULL,
	amount FLOAT NOT NULL,
	"Building_id" TEXT,
	"Schematic_id" TEXT,
	"Collectible_id" TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY(item) REFERENCES "Item" (id),
	FOREIGN KEY("Building_id") REFERENCES "Building" (id),
	FOREIGN KEY("Schematic_id") REFERENCES "Schematic" (id),
	FOREIGN KEY("Collectible_id") REFERENCES "Collectible" (id)
);
CREATE INDEX "ix_ItemAmount_id" ON "ItemAmount" (id);

CREATE TABLE "Ingredient" (
	id INTEGER NOT NULL,
	item TEXT NOT NULL,
	amount FLOAT NOT NULL,
	"Recipe_id" TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY(item) REFERENCES "Item" (id),
	FOREIGN KEY("Recipe_id") REFERENCES "Recipe" (id)
);
CREATE INDEX "ix_Ingredient_id" ON "Ingredient" (id);

CREATE TABLE "Product" (
	id INTEGER NOT NULL,
	item TEXT NOT NULL,
	amount FLOAT NOT NULL,
	"Recipe_id" TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY(item) REFERENCES "Item" (id),
	FOREIGN KEY("Recipe_id") REFERENCES "Recipe" (id)
);
CREATE INDEX "ix_Product_id" ON "Product" (id);

CREATE TABLE "HistoryEntry" (
	id INTEGER NOT NULL,
	patch TEXT NOT NULL,
	summary TEXT,
	details TEXT,
	"Item_id" TEXT,
	"Building_id" TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY("Item_id") REFERENCES "Item" (id),
	FOREIGN KEY("Building_id") REFERENCES "Building" (id)
);
CREATE INDEX "ix_HistoryEntry_id" ON "HistoryEntry" (id);

CREATE TABLE "ResourceNode" (
	id TEXT NOT NULL,
	resource TEXT NOT NULL,
	purity VARCHAR(6) NOT NULL,
	type VARCHAR(14) NOT NULL,
	x FLOAT NOT NULL,
	y FLOAT NOT NULL,
	z FLOAT NOT NULL,
	"GameData_id" INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY(resource) REFERENCES "Item" (id),
	FOREIGN KEY("GameData_id") REFERENCES "GameData" (id)
);
CREATE INDEX "ix_ResourceNode_id" ON "ResourceNode" (id);

CREATE TABLE "Item_wikiCategories" (
	"Item_id" TEXT,
	"wikiCategories" TEXT,
	PRIMARY KEY ("Item_id", "wikiCategories"),
	FOREIGN KEY("Item_id") REFERENCES "Item" (id)
);
CREATE INDEX "ix_Item_wikiCategories_Item_id" ON "Item_wikiCategories" ("Item_id");
CREATE INDEX "ix_Item_wikiCategories_wikiCategories" ON "Item_wikiCategories" ("wikiCategories");

CREATE TABLE "Item_derivedFrom" (
	"Item_id" TEXT,
	"derivedFrom_id" TEXT NOT NULL,
	PRIMARY KEY ("Item_id", "derivedFrom_id"),
	FOREIGN KEY("Item_id") REFERENCES "Item" (id),
	FOREIGN KEY("derivedFrom_id") REFERENCES "Source" (id)
);
CREATE INDEX "ix_Item_derivedFrom_Item_id" ON "Item_derivedFrom" ("Item_id");
CREATE INDEX "ix_Item_derivedFrom_derivedFrom_id" ON "Item_derivedFrom" ("derivedFrom_id");

CREATE TABLE "Recipe_producedIn" (
	"Recipe_id" TEXT,
	"producedIn_id" TEXT,
	PRIMARY KEY ("Recipe_id", "producedIn_id"),
	FOREIGN KEY("Recipe_id") REFERENCES "Recipe" (id),
	FOREIGN KEY("producedIn_id") REFERENCES "Building" (id)
);
CREATE INDEX "ix_Recipe_producedIn_Recipe_id" ON "Recipe_producedIn" ("Recipe_id");
CREATE INDEX "ix_Recipe_producedIn_producedIn_id" ON "Recipe_producedIn" ("producedIn_id");

CREATE TABLE "Recipe_derivedFrom" (
	"Recipe_id" TEXT,
	"derivedFrom_id" TEXT NOT NULL,
	PRIMARY KEY ("Recipe_id", "derivedFrom_id"),
	FOREIGN KEY("Recipe_id") REFERENCES "Recipe" (id),
	FOREIGN KEY("derivedFrom_id") REFERENCES "Source" (id)
);
CREATE INDEX "ix_Recipe_derivedFrom_Recipe_id" ON "Recipe_derivedFrom" ("Recipe_id");
CREATE INDEX "ix_Recipe_derivedFrom_derivedFrom_id" ON "Recipe_derivedFrom" ("derivedFrom_id");

CREATE TABLE "Building_derivedFrom" (
	"Building_id" TEXT,
	"derivedFrom_id" TEXT NOT NULL,
	PRIMARY KEY ("Building_id", "derivedFrom_id"),
	FOREIGN KEY("Building_id") REFERENCES "Building" (id),
	FOREIGN KEY("derivedFrom_id") REFERENCES "Source" (id)
);
CREATE INDEX "ix_Building_derivedFrom_Building_id" ON "Building_derivedFrom" ("Building_id");
CREATE INDEX "ix_Building_derivedFrom_derivedFrom_id" ON "Building_derivedFrom" ("derivedFrom_id");

CREATE TABLE "ExtractorSpec_resources" (
	"ExtractorSpec_id" INTEGER,
	resources_id TEXT,
	PRIMARY KEY ("ExtractorSpec_id", resources_id),
	FOREIGN KEY("ExtractorSpec_id") REFERENCES "ExtractorSpec" (id),
	FOREIGN KEY(resources_id) REFERENCES "Item" (id)
);
CREATE INDEX "ix_ExtractorSpec_resources_ExtractorSpec_id" ON "ExtractorSpec_resources" ("ExtractorSpec_id");
CREATE INDEX "ix_ExtractorSpec_resources_resources_id" ON "ExtractorSpec_resources" (resources_id);

CREATE TABLE "Schematic_dependsOn" (
	"Schematic_id" TEXT,
	"dependsOn_id" TEXT,
	PRIMARY KEY ("Schematic_id", "dependsOn_id"),
	FOREIGN KEY("Schematic_id") REFERENCES "Schematic" (id),
	FOREIGN KEY("dependsOn_id") REFERENCES "Schematic" (id)
);
CREATE INDEX "ix_Schematic_dependsOn_Schematic_id" ON "Schematic_dependsOn" ("Schematic_id");
CREATE INDEX "ix_Schematic_dependsOn_dependsOn_id" ON "Schematic_dependsOn" ("dependsOn_id");

CREATE TABLE "Schematic_derivedFrom" (
	"Schematic_id" TEXT,
	"derivedFrom_id" TEXT NOT NULL,
	PRIMARY KEY ("Schematic_id", "derivedFrom_id"),
	FOREIGN KEY("Schematic_id") REFERENCES "Schematic" (id),
	FOREIGN KEY("derivedFrom_id") REFERENCES "Source" (id)
);
CREATE INDEX "ix_Schematic_derivedFrom_Schematic_id" ON "Schematic_derivedFrom" ("Schematic_id");
CREATE INDEX "ix_Schematic_derivedFrom_derivedFrom_id" ON "Schematic_derivedFrom" ("derivedFrom_id");

CREATE TABLE "SchematicUnlocks_recipes" (
	"SchematicUnlocks_id" INTEGER,
	recipes_id TEXT,
	PRIMARY KEY ("SchematicUnlocks_id", recipes_id),
	FOREIGN KEY("SchematicUnlocks_id") REFERENCES "SchematicUnlocks" (id),
	FOREIGN KEY(recipes_id) REFERENCES "Recipe" (id)
);
CREATE INDEX "ix_SchematicUnlocks_recipes_SchematicUnlocks_id" ON "SchematicUnlocks_recipes" ("SchematicUnlocks_id");
CREATE INDEX "ix_SchematicUnlocks_recipes_recipes_id" ON "SchematicUnlocks_recipes" (recipes_id);

CREATE TABLE "SchematicUnlocks_schematics" (
	"SchematicUnlocks_id" INTEGER,
	schematics_id TEXT,
	PRIMARY KEY ("SchematicUnlocks_id", schematics_id),
	FOREIGN KEY("SchematicUnlocks_id") REFERENCES "SchematicUnlocks" (id),
	FOREIGN KEY(schematics_id) REFERENCES "Schematic" (id)
);
CREATE INDEX "ix_SchematicUnlocks_schematics_SchematicUnlocks_id" ON "SchematicUnlocks_schematics" ("SchematicUnlocks_id");
CREATE INDEX "ix_SchematicUnlocks_schematics_schematics_id" ON "SchematicUnlocks_schematics" (schematics_id);

CREATE TABLE "Collectible_derivedFrom" (
	"Collectible_id" TEXT,
	"derivedFrom_id" TEXT NOT NULL,
	PRIMARY KEY ("Collectible_id", "derivedFrom_id"),
	FOREIGN KEY("Collectible_id") REFERENCES "Collectible" (id),
	FOREIGN KEY("derivedFrom_id") REFERENCES "Source" (id)
);
CREATE INDEX "ix_Collectible_derivedFrom_Collectible_id" ON "Collectible_derivedFrom" ("Collectible_id");
CREATE INDEX "ix_Collectible_derivedFrom_derivedFrom_id" ON "Collectible_derivedFrom" ("derivedFrom_id");

CREATE TABLE "GeneratorFuel" (
	id INTEGER NOT NULL,
	item TEXT NOT NULL,
	supplemental TEXT,
	"GeneratorSpec_id" INTEGER,
	byproduct_id INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY(item) REFERENCES "Item" (id),
	FOREIGN KEY(supplemental) REFERENCES "Item" (id),
	FOREIGN KEY("GeneratorSpec_id") REFERENCES "GeneratorSpec" (id),
	FOREIGN KEY(byproduct_id) REFERENCES "ItemAmount" (id)
);
CREATE INDEX "ix_GeneratorFuel_id" ON "GeneratorFuel" (id);

CREATE TABLE "ResourceNode_derivedFrom" (
	"ResourceNode_id" TEXT,
	"derivedFrom_id" TEXT NOT NULL,
	PRIMARY KEY ("ResourceNode_id", "derivedFrom_id"),
	FOREIGN KEY("ResourceNode_id") REFERENCES "ResourceNode" (id),
	FOREIGN KEY("derivedFrom_id") REFERENCES "Source" (id)
);
CREATE INDEX "ix_ResourceNode_derivedFrom_ResourceNode_id" ON "ResourceNode_derivedFrom" ("ResourceNode_id");
CREATE INDEX "ix_ResourceNode_derivedFrom_derivedFrom_id" ON "ResourceNode_derivedFrom" ("derivedFrom_id");

