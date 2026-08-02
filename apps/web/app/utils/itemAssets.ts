import {
  definitions,
  hasItemAsset,
  itemArtworkStyleVariables,
  type ItemAssetKind,
} from "@battleness/content";

export type { ItemAssetKind };
export type ItemRarity = "common" | "refined" | "rare" | "epic";

const itemRarities = {
  ring: new Map(definitions.rings.map((definition) => [definition.id, definition.rarity])),
  gem: new Map(definitions.gems.map((definition) => [definition.id, definition.rarity])),
  monster: new Map(definitions.monsters.map((definition) => [definition.id, definition.rarity])),
  spell: new Map(definitions.spells.map((definition) => [definition.id, definition.rarity])),
  material: new Map(definitions.materials.map((definition) => [definition.id, definition.rarity])),
} satisfies Record<ItemAssetKind, ReadonlyMap<string, ItemRarity>>;

export function itemArtworkStyle(kind: string, definitionId: string): Record<string, string> {
  return isItemAssetKind(kind) ? itemArtworkStyleVariables(kind, definitionId) : {};
}

export function hasItemArtwork(kind: string, definitionId: string): boolean {
  return isItemAssetKind(kind) && hasItemAsset(kind, definitionId);
}

export function itemArtworkRarityClass(
  kind: string,
  definitionId: string,
  rarity?: string,
): string | undefined {
  const resolvedRarity = isItemRarity(rarity)
    ? rarity
    : isItemAssetKind(kind)
      ? itemRarities[kind].get(definitionId)
      : undefined;
  return resolvedRarity ? `rarity-border-${resolvedRarity}` : undefined;
}

function isItemAssetKind(kind: string): kind is ItemAssetKind {
  return (
    kind === "ring" ||
    kind === "gem" ||
    kind === "monster" ||
    kind === "spell" ||
    kind === "material"
  );
}

function isItemRarity(rarity: string | undefined): rarity is ItemRarity {
  return rarity === "common" || rarity === "refined" || rarity === "rare" || rarity === "epic";
}
