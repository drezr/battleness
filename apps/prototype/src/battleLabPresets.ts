import {
  parseBattleLabConfigJson,
  serializeBattleLabConfig,
  type BattleLabConfig,
} from "@battleness/content";

export type BattleLabPreset = {
  name: string;
  config: BattleLabConfig;
};

const storageKey = "battleness.battleLab.presets.v3";

export function listBattleLabPresets(storage: Storage = localStorage): BattleLabPreset[] {
  const rawValue = storage.getItem(storageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const value = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .flatMap((entry) => {
        if (
          typeof entry !== "object" ||
          entry === null ||
          !("name" in entry) ||
          typeof entry.name !== "string" ||
          !entry.name.trim() ||
          !("config" in entry)
        ) {
          return [];
        }

        try {
          return [
            {
              name: entry.name.trim(),
              config: parseBattleLabConfigJson(JSON.stringify(entry.config)),
            },
          ];
        } catch {
          return [];
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

export function saveBattleLabPreset(
  name: string,
  config: BattleLabConfig,
  storage: Storage = localStorage,
): BattleLabPreset[] {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("A preset name is required.");
  }

  const presets = listBattleLabPresets(storage).filter(
    (preset) => preset.name.toLocaleLowerCase() !== normalizedName.toLocaleLowerCase(),
  );
  presets.push({
    name: normalizedName,
    config: parseBattleLabConfigJson(serializeBattleLabConfig(config)),
  });
  presets.sort((left, right) => left.name.localeCompare(right.name));
  persistPresets(presets, storage);
  return presets;
}

export function loadBattleLabPreset(
  name: string,
  storage: Storage = localStorage,
): BattleLabConfig {
  const preset = listBattleLabPresets(storage).find((candidate) => candidate.name === name);
  if (!preset) {
    throw new Error(`Battle Lab preset "${name}" was not found.`);
  }

  return parseBattleLabConfigJson(serializeBattleLabConfig(preset.config));
}

export function deleteBattleLabPreset(
  name: string,
  storage: Storage = localStorage,
): BattleLabPreset[] {
  const presets = listBattleLabPresets(storage).filter((preset) => preset.name !== name);
  persistPresets(presets, storage);
  return presets;
}

function persistPresets(presets: readonly BattleLabPreset[], storage: Storage): void {
  storage.setItem(storageKey, JSON.stringify(presets));
}
