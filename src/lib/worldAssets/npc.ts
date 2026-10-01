/**
 * NPC Creation Files (`npc.record`) — named NPCs with motives, secrets, and links.
 * Stored as the `npc` collection of the unified Library engine.
 */

import { defineCollection } from "@/lib/library/defineCollection";
import { legacyKvDatabase, legacyLocalStorage } from "@/lib/library/legacySources";

const LEGACY_STORAGE_KEY = "ddeasy-npc-library-v1";

export const NPCS_CHANGED_EVENT = "ddeasy-npcs-changed";
const MAX_NPCS = 256;

export type NpcSource = "created" | "import";

export type SavedNpc = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  briefDescription: string;
  tags: string[];
  motivation: string;
  secrets: string;
  statBlockRef: string | null;
  locationId: string | null;
  factionIds: string[];
  markdown: string;
  source: NpcSource;
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

export function fixSavedNpc(value: unknown): SavedNpc | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) return null;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id: o.id,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    name: o.name.trim(),
    briefDescription: typeof o.briefDescription === "string" ? o.briefDescription : "",
    tags: stringArray(o.tags),
    motivation: typeof o.motivation === "string" ? o.motivation : "",
    secrets: typeof o.secrets === "string" ? o.secrets : "",
    statBlockRef: typeof o.statBlockRef === "string" ? o.statBlockRef : null,
    locationId: typeof o.locationId === "string" ? o.locationId : null,
    factionIds: stringArray(o.factionIds),
    markdown: typeof o.markdown === "string" ? o.markdown : "",
    source: o.source === "created" ? "created" : "import",
  };
}

const npcs = defineCollection<SavedNpc>({
  name: "npc",
  normalize: fixSavedNpc,
  max: MAX_NPCS,
  changedEvent: NPCS_CHANGED_EVENT,
  compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  mirrorKey: "ddeasy-library-npc",
  legacySources: [
    legacyKvDatabase(LEGACY_STORAGE_KEY, "kv", "npcs"),
    legacyLocalStorage(LEGACY_STORAGE_KEY),
  ],
});

export async function loadSavedNpcs(): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  return npcs.load();
}

export type SaveNpcInput = {
  name: string;
  briefDescription?: string;
  tags?: string[];
  motivation?: string;
  secrets?: string;
  statBlockRef?: string | null;
  locationId?: string | null;
  factionIds?: string[];
  markdown?: string;
  source?: NpcSource;
};

export async function saveNpc(input: SaveNpcInput): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  return npcs.write((current) => {
    if (!input.name.trim()) throw new Error("An NPC needs at least a name.");
    const now = new Date().toISOString();
    const record: SavedNpc = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      name: input.name.trim(),
      briefDescription: input.briefDescription?.trim() ?? "",
      tags: stringArray(input.tags),
      motivation: input.motivation ?? "",
      secrets: input.secrets ?? "",
      statBlockRef: input.statBlockRef ?? null,
      locationId: input.locationId ?? null,
      factionIds: stringArray(input.factionIds),
      markdown: input.markdown ?? `# ${input.name.trim()}\n\n`,
      source: input.source ?? "created",
    };
    return [record, ...current];
  });
}

export async function updateNpc(id: string, patch: SaveNpcInput): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  return npcs.write((current) => {
    const now = new Date().toISOString();
    return current.map((row) => {
      if (row.id !== id) return row;
      return {
        ...row,
        name: patch.name.trim() || row.name,
        briefDescription: patch.briefDescription?.trim() ?? row.briefDescription,
        tags: patch.tags !== undefined ? stringArray(patch.tags) : row.tags,
        motivation: patch.motivation ?? row.motivation,
        secrets: patch.secrets ?? row.secrets,
        statBlockRef: patch.statBlockRef !== undefined ? patch.statBlockRef : row.statBlockRef,
        locationId: patch.locationId !== undefined ? patch.locationId : row.locationId,
        factionIds: patch.factionIds !== undefined ? stringArray(patch.factionIds) : row.factionIds,
        markdown: patch.markdown ?? row.markdown,
        updatedAt: now,
      };
    });
  });
}

export async function deleteSavedNpc(id: string): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  return npcs.write((current) => current.filter((row) => row.id !== id));
}

export async function importSavedNpcs(
  rows: unknown[],
): Promise<{ added: number; npcs: SavedNpc[] }> {
  if (typeof window === "undefined") return { added: 0, npcs: [] };
  const { added, rows: next } = await npcs.importRows(rows);
  return { added, npcs: next };
}

export function onNpcsChanged(listener: () => void): () => void {
  return npcs.subscribe(listener);
}
