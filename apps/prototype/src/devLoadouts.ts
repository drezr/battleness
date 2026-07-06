export type DevelopmentLoadout = {
  id: string;
  name: string;
  ringInstanceIds: string[];
};

const storageKey = "battleness.developmentLoadouts.v1";
const format = "battlenessDevelopmentLoadouts";

export function listDevelopmentLoadouts(storage: Storage = localStorage): DevelopmentLoadout[] {
  const rawValue = storage.getItem(storageKey);
  if (!rawValue) {
    return [];
  }

  try {
    return parseDevelopmentLoadoutsJson(rawValue);
  } catch {
    return [];
  }
}

export function saveDevelopmentLoadout(
  name: string,
  ringInstanceIds: string[],
  storage: Storage = localStorage,
): DevelopmentLoadout {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("A loadout name is required.");
  }
  if (ringInstanceIds.length < 1 || ringInstanceIds.length > 10) {
    throw new Error("A development loadout must contain between 1 and 10 rings.");
  }

  const loadout = {
    id: loadoutId(normalizedName),
    name: normalizedName,
    ringInstanceIds,
  };
  const nextLoadouts = [
    loadout,
    ...listDevelopmentLoadouts(storage).filter((candidate) => candidate.id !== loadout.id),
  ].sort((first, second) => first.name.localeCompare(second.name));

  storage.setItem(storageKey, serializeDevelopmentLoadouts(nextLoadouts));
  return loadout;
}

export function deleteDevelopmentLoadout(
  loadoutIdToDelete: string,
  storage: Storage = localStorage,
): void {
  storage.setItem(
    storageKey,
    serializeDevelopmentLoadouts(
      listDevelopmentLoadouts(storage).filter((loadout) => loadout.id !== loadoutIdToDelete),
    ),
  );
}

export function parseDevelopmentLoadoutsJson(value: string): DevelopmentLoadout[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Development loadouts are not valid JSON.");
  }

  if (!isRecord(parsed) || parsed.format !== format || parsed.version !== 1) {
    throw new Error("Development loadouts format is not supported.");
  }
  if (!Array.isArray(parsed.loadouts)) {
    throw new Error("Development loadouts must be an array.");
  }

  return parsed.loadouts.map(parseDevelopmentLoadout);
}

function serializeDevelopmentLoadouts(loadouts: readonly DevelopmentLoadout[]): string {
  return JSON.stringify(
    {
      format,
      version: 1,
      loadouts,
    },
    null,
    2,
  );
}

function parseDevelopmentLoadout(value: unknown): DevelopmentLoadout {
  if (!isRecord(value)) {
    throw new Error("Development loadout has an invalid shape.");
  }

  return {
    id: parseString(value.id, "loadout.id"),
    name: parseString(value.name, "loadout.name"),
    ringInstanceIds: parseStringArray(value.ringInstanceIds, "loadout.ringInstanceIds").slice(
      0,
      10,
    ),
  };
}

function loadoutId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `development-loadout.${slug || "unnamed"}`;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string" && entry)) {
    throw new Error(`${label} must be a string array.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
