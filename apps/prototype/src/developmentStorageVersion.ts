const legacyStorageKeys = [
  "battleness.developmentInventory.v1",
  "battleness.developmentLoadouts.v1",
  "battleness.battleLab.presets.v1",
] as const;

export function clearIncompatibleDevelopmentStorage(storage: Storage = localStorage): boolean {
  const hadLegacyData = legacyStorageKeys.some((key) => storage.getItem(key) !== null);

  for (const key of legacyStorageKeys) {
    storage.removeItem(key);
  }

  return hadLegacyData;
}
