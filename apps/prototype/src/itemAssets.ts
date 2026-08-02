import {
  itemArtworkStyleVariables,
  validateItemAssets,
  type ItemAssetKind,
} from "@battleness/content";

export type { ItemAssetKind };
export { validateItemAssets };

export function itemArtworkStyle(kind: ItemAssetKind, definitionId: string): string {
  return Object.entries(itemArtworkStyleVariables(kind, definitionId))
    .map(([property, value]) => `${property}: ${value}`)
    .join(";");
}
