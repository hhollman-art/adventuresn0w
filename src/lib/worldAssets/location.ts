/**
 * Location Creation Files (`location.record`) — cities, dungeons, regions, and sites.
 * Stored as the `location` collection of the unified Library engine.
 */

import { defineCollection } from "@/lib/library/defineCollection";
import { legacyKvDatabase, legacyLocalStorage } from "@/lib/library/legacySources";

const LEGACY_STORAGE_KEY = "ddeasy-location-library-v1";

export const LOCATIONS_CHANGED_EVENT = "ddeasy-locations-changed";
const MAX_LOCATIONS = 256;

export type LocationKind =
  | "city"
  | "dungeon"
  | "region"
  | "wilderness"
  | "site"
  | "plane"
  | "other";

export type LocationSource = "created" | "import";

export type SavedLocation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  locationKind: LocationKind;
  parentLocationId: string | null;
  inhabitantNpcIds: string[];
  factionIds: string[];
  timelineNotes: string;
  markdown: string;
  source: LocationSource;
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === "string"))]
    : [];
}

const LOCATION_KINDS: LocationKind[] = [
  "city",
  "dungeon",
  "region",
  "wilderness",
  "site",
  "plane",
  "other",
];

function parseLocationKind(value: unknown): LocationKind {
  return typeof value === "string" && (LOCATION_KINDS as string[]).includes(value)
    ? (value as LocationKind)
    : "other";
}

export function fixSavedLocation(value: unknown): SavedLocation | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) return null;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id: o.id,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    name: o.name.trim(),
    locationKind: parseLocationKind(o.locationKind),
    parentLocationId: typeof o.parentLocationId === "string" ? o.parentLocationId : null,
    inhabitantNpcIds: stringArray(o.inhabitantNpcIds),
    factionIds: stringArray(o.factionIds),
    timelineNotes: typeof o.timelineNotes === "string" ? o.timelineNotes : "",
    markdown: typeof o.markdown === "string" ? o.markdown : "",
    source: o.source === "created" ? "created" : "import",
  };
}

const locations = defineCollection<SavedLocation>({
  name: "location",
  normalize: fixSavedLocation,
  max: MAX_LOCATIONS,
  changedEvent: LOCATIONS_CHANGED_EVENT,
  compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  mirrorKey: "ddeasy-library-location",
  legacySources: [
    legacyKvDatabase(LEGACY_STORAGE_KEY, "kv", "locations"),
    legacyLocalStorage(LEGACY_STORAGE_KEY),
  ],
});

export async function loadSavedLocations(): Promise<SavedLocation[]> {
  if (typeof window === "undefined") return [];
  return locations.load();
}

export type SaveLocationInput = {
  name: string;
  locationKind?: LocationKind;
  parentLocationId?: string | null;
  inhabitantNpcIds?: string[];
  factionIds?: string[];
  timelineNotes?: string;
  markdown?: string;
  source?: LocationSource;
};

export async function saveLocation(input: SaveLocationInput): Promise<SavedLocation[]> {
  if (typeof window === "undefined") return [];
  return locations.write((current) => {
    if (!input.name.trim()) throw new Error("A location needs at least a name.");
    const now = new Date().toISOString();
    const record: SavedLocation = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      name: input.name.trim(),
      locationKind: input.locationKind ?? "other",
      parentLocationId: input.parentLocationId ?? null,
      inhabitantNpcIds: stringArray(input.inhabitantNpcIds),
      factionIds: stringArray(input.factionIds),
      timelineNotes: input.timelineNotes ?? "",
      markdown: input.markdown ?? `# ${input.name.trim()}\n\n`,
      source: input.source ?? "created",
    };
    return [record, ...current];
  });
}

export async function updateLocation(
  id: string,
  patch: SaveLocationInput,
): Promise<SavedLocation[]> {
  if (typeof window === "undefined") return [];
  return locations.write((current) => {
    const now = new Date().toISOString();
    return current.map((row) => {
      if (row.id !== id) return row;
      return {
        ...row,
        name: patch.name.trim() || row.name,
        locationKind: patch.locationKind ?? row.locationKind,
        parentLocationId:
          patch.parentLocationId !== undefined ? patch.parentLocationId : row.parentLocationId,
        inhabitantNpcIds:
          patch.inhabitantNpcIds !== undefined
            ? stringArray(patch.inhabitantNpcIds)
            : row.inhabitantNpcIds,
        factionIds: patch.factionIds !== undefined ? stringArray(patch.factionIds) : row.factionIds,
        timelineNotes: patch.timelineNotes ?? row.timelineNotes,
        markdown: patch.markdown ?? row.markdown,
        updatedAt: now,
      };
    });
  });
}

export async function deleteSavedLocation(id: string): Promise<SavedLocation[]> {
  if (typeof window === "undefined") return [];
  return locations.write((current) => current.filter((row) => row.id !== id));
}

export async function importSavedLocations(
  rows: unknown[],
): Promise<{ added: number; locations: SavedLocation[] }> {
  if (typeof window === "undefined") return { added: 0, locations: [] };
  const { added, rows: next } = await locations.importRows(rows);
  return { added, locations: next };
}

export function onLocationsChanged(listener: () => void): () => void {
  return locations.subscribe(listener);
}

export const LOCATION_KIND_LABEL: Record<LocationKind, string> = {
  city: "City",
  dungeon: "Dungeon",
  region: "Region",
  wilderness: "Wilderness",
  site: "Site",
  plane: "Plane",
  other: "Other",
};
