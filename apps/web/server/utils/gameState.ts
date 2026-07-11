import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  canCraftRecipe,
  craftRecipe,
  createMaterialStock,
  definitions,
  locales,
  type CraftableItemType,
  type CraftedItemInstance,
  type MaterialDefinition,
  type MaterialStock,
  type RecipeDefinition,
} from "@battleness/content";

type PlayerRow = {
  id: string;
  username: string;
  experience: number;
  credits: number;
  next_item_sequence: number;
};

type MaterialStockRow = {
  material_id: string;
  quantity: number;
};

type InventoryItemRow = {
  id: string;
  player_id: string;
  type: CraftableItemType;
  definition_id: string;
  experience: number;
  quality: number;
  socket_count: number | null;
  socketed_gem_instance_ids: string;
  enchantment: string | null;
  equipped: number;
};

type CraftableDefinition = {
  id: string;
  nameKey: string;
  rarity: string;
  element: string;
};

const DEV_PLAYER_ID = "devPlayer";
const databasePath =
  process.env.BATTLENESS_DB_PATH ??
  fileURLToPath(new URL("../../data/battleness.local.sqlite", import.meta.url));

let database: DatabaseSync | undefined;

export type WebPlayerState = ReturnType<typeof getPlayerState>;

export function getPlayerState() {
  const db = useDatabase();
  const player = getPlayer(db);
  const stock = getMaterialStock(db, player.id);

  return {
    player: {
      id: player.id,
      username: player.username,
      experience: player.experience,
      credits: player.credits,
    },
    materials: definitions.materials.map((material) => ({
      id: material.id,
      label: label(material.nameKey),
      description: label(material.descriptionKey),
      rarity: material.rarity,
      craftingFamily: material.craftingFamily,
      realWorldType: material.realWorldType,
      chemicalSymbol: material.chemicalSymbol ?? null,
      atomicNumber: material.atomicNumber ?? null,
      quantity: stock[material.id] ?? 0,
    })),
    inventory: getInventoryRows(db, player.id).map(toInventoryView),
    recipes: definitions.recipes.map((recipe) => toRecipeView(recipe, stock)),
  };
}

export function craftPlayerRecipe(recipeId: string) {
  const db = useDatabase();
  const recipe = definitions.recipes.find((candidate) => candidate.id === recipeId);

  if (!recipe) {
    throw new Error(`Unknown recipe "${recipeId}".`);
  }

  const player = getPlayer(db);
  const stock = getMaterialStock(db, player.id);
  const result = craftRecipe({
    recipe,
    ownerId: player.id,
    stock,
    instanceSequence: player.next_item_sequence,
  });

  db.exec("BEGIN IMMEDIATE");
  try {
    saveMaterialStock(db, player.id, result.stock);
    insertCraftedItem(db, player.id, result.crafted);
    db.prepare("UPDATE players SET next_item_sequence = ? WHERE id = ?").run(
      player.next_item_sequence + 1,
      player.id,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    crafted: toCraftedItemView(result.crafted),
    state: getPlayerState(),
  };
}

function useDatabase(): DatabaseSync {
  if (database) {
    return database;
  }

  mkdirSync(dirname(databasePath), { recursive: true });
  database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");
  migrate(database);
  seed(database);
  return database;
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      experience INTEGER NOT NULL DEFAULT 0,
      credits INTEGER NOT NULL DEFAULT 0,
      next_item_sequence INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS material_stock (
      player_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (player_id, material_id),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      type TEXT NOT NULL,
      definition_id TEXT NOT NULL,
      experience INTEGER NOT NULL,
      quality INTEGER NOT NULL,
      socket_count INTEGER,
      socketed_gem_instance_ids TEXT NOT NULL DEFAULT '[]',
      enchantment TEXT,
      equipped INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
  `);
}

function seed(db: DatabaseSync): void {
  db.prepare(
    "INSERT OR IGNORE INTO players (id, username, experience, credits, next_item_sequence) VALUES (?, ?, ?, ?, ?)",
  ).run(DEV_PLAYER_ID, "Dev Player", 0, 1000, 1);

  const existingStock = db
    .prepare("SELECT COUNT(*) AS count FROM material_stock WHERE player_id = ?")
    .get(DEV_PLAYER_ID) as { count: number };

  if (existingStock.count > 0) {
    return;
  }

  const startingStock = createMaterialStock(definitions.materials, 2);
  saveMaterialStock(db, DEV_PLAYER_ID, startingStock);
}

function getPlayer(db: DatabaseSync): PlayerRow {
  return db.prepare("SELECT * FROM players WHERE id = ?").get(DEV_PLAYER_ID) as PlayerRow;
}

function getMaterialStock(db: DatabaseSync, playerId: string): MaterialStock {
  const rows = db
    .prepare("SELECT material_id, quantity FROM material_stock WHERE player_id = ?")
    .all(playerId) as MaterialStockRow[];

  return Object.fromEntries(rows.map((row) => [row.material_id, row.quantity]));
}

function saveMaterialStock(db: DatabaseSync, playerId: string, stock: MaterialStock): void {
  const statement = db.prepare(`
    INSERT INTO material_stock (player_id, material_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(player_id, material_id) DO UPDATE SET quantity = excluded.quantity
  `);

  for (const material of definitions.materials) {
    statement.run(playerId, material.id, stock[material.id] ?? 0);
  }
}

function getInventoryRows(db: DatabaseSync, playerId: string): InventoryItemRow[] {
  return db
    .prepare("SELECT * FROM inventory_items WHERE player_id = ? ORDER BY rowid DESC")
    .all(playerId) as InventoryItemRow[];
}

function insertCraftedItem(
  db: DatabaseSync,
  playerId: string,
  crafted: CraftedItemInstance,
): void {
  const item = crafted.item;
  db.prepare(`
    INSERT INTO inventory_items (
      id,
      player_id,
      type,
      definition_id,
      experience,
      quality,
      socket_count,
      socketed_gem_instance_ids,
      enchantment,
      equipped
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    playerId,
    crafted.type,
    item.definitionId,
    item.experience,
    item.quality,
    crafted.type === "ring" ? crafted.item.socketCount : null,
    crafted.type === "ring" ? JSON.stringify(crafted.item.socketedGemInstanceIds) : "[]",
    crafted.type === "gem" && crafted.item.enchantment
      ? JSON.stringify(crafted.item.enchantment)
      : null,
    crafted.type === "ring" && crafted.item.equipped ? 1 : 0,
  );
}

function toInventoryView(row: InventoryItemRow) {
  const definition = getCraftableDefinition(row.type, row.definition_id);

  return {
    id: row.id,
    type: row.type,
    definitionId: row.definition_id,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: row.experience,
    quality: row.quality,
    socketCount: row.socket_count,
    equipped: row.equipped === 1,
  };
}

function toCraftedItemView(crafted: CraftedItemInstance) {
  const definition = getCraftableDefinition(crafted.type, crafted.item.definitionId);

  return {
    id: crafted.item.id,
    type: crafted.type,
    definitionId: crafted.item.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
  };
}

function toRecipeView(recipe: RecipeDefinition, stock: MaterialStock) {
  const output = getCraftableDefinition(recipe.outputType, recipe.outputDefinitionId);

  return {
    id: recipe.id,
    outputType: recipe.outputType,
    outputDefinitionId: recipe.outputDefinitionId,
    outputLabel: label(output.nameKey),
    outputRarity: output.rarity,
    outputElement: output.element,
    craftedLevel: recipe.craftedLevel,
    craftedQuality: recipe.craftedQuality,
    canCraft: canCraftRecipe(recipe, stock),
    ingredients: recipe.ingredients.map((ingredient) => {
      const material = getMaterialDefinition(ingredient.materialId);

      return {
        materialId: ingredient.materialId,
        label: label(material.nameKey),
        quantity: ingredient.quantity,
        available: stock[ingredient.materialId] ?? 0,
      };
    }),
  };
}

function getCraftableDefinition(type: CraftableItemType, definitionId: string): CraftableDefinition {
  const collections = {
    ring: definitions.rings,
    gem: definitions.gems,
    monster: definitions.monsters,
    spell: definitions.spells,
  };
  const definition = collections[type].find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown ${type} definition "${definitionId}".`);
  }

  return definition;
}

function getMaterialDefinition(materialId: string): MaterialDefinition {
  const material = definitions.materials.find((candidate) => candidate.id === materialId);

  if (!material) {
    throw new Error(`Unknown material "${materialId}".`);
  }

  return material;
}

function label(key: string): string {
  return (locales.en as Record<string, string>)[key] ?? key;
}
