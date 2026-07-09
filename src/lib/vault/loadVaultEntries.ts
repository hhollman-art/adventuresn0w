import type { CiClass } from "@/lib/ciRegistry";
import {
  characterToLibraryEntry,
  customSrdToLibraryEntry,
  gameItemToLibraryEntry,
  npcToLibraryEntry,
  type LibraryListEntry,
} from "@/lib/workshop/libraryCatalog";
import { loadSavedCharacters } from "@/lib/tabletop/characterLibrary";
import { loadSavedGameItems } from "@/lib/itemLibrary";
import { loadSavedNpcs } from "@/lib/worldAssets/npc";
import { loadSavedCustomSrdEntries } from "@/lib/srd/srdCustomLibrary";
import { sourceSrdEntityIdFromGameItem } from "@/lib/vault/vaultSrdPark";
import {
  entryIsVaultExcluded,
  loadVaultExcludedIds,
} from "@/lib/vault/vaultExclusion";

export type VaultShelf = "all" | "heroes" | "lore" | "rules" | "gear";

export type VaultCardEntry = LibraryListEntry & {
  shelf: Exclude<VaultShelf, "all">;
  /** When this Library CF was hydrated from a bundled SRD entity. */
  sourceSrdEntityId?: string | null;
};

const SHELF_CI: Record<Exclude<VaultShelf, "all">, CiClass[]> = {
  heroes: ["character.sheet", "party.roster"],
  lore: ["npc.record", "location.record"],
  rules: ["rules.custom-entry", "spell.srd-entry", "rules.srd-entry", "monster.srd-entry"],
  gear: ["item.equipment", "item.magic"],
};

function shelfForEntry(entry: LibraryListEntry): VaultCardEntry["shelf"] {
  if (SHELF_CI.heroes.includes(entry.ciClass)) return "heroes";
  if (SHELF_CI.lore.includes(entry.ciClass)) return "lore";
  if (SHELF_CI.gear.includes(entry.ciClass)) return "gear";
  return "rules";
}

/** Load deployable user-owned CF mini-cards for the Lore Vault drawer. */
export async function loadVaultCardEntries(): Promise<VaultCardEntry[]> {
  const [characters, items, npcs, customSrd, excludedIds] = await Promise.all([
    loadSavedCharacters(),
    loadSavedGameItems(),
    loadSavedNpcs(),
    loadSavedCustomSrdEntries(),
    loadVaultExcludedIds(),
  ]);

  const entries: VaultCardEntry[] = [
    ...characters.map((row) => {
      const entry = characterToLibraryEntry(row);
      return { ...entry, shelf: shelfForEntry(entry), sourceSrdEntityId: null };
    }),
    ...items.map((row) => {
      const entry = gameItemToLibraryEntry(row);
      return {
        ...entry,
        shelf: shelfForEntry(entry),
        sourceSrdEntityId: sourceSrdEntityIdFromGameItem(row),
      };
    }),
    ...npcs.map((row) => {
      const entry = npcToLibraryEntry(row);
      return { ...entry, shelf: shelfForEntry(entry), sourceSrdEntityId: null };
    }),
    ...customSrd.map((row) => {
      const entry = customSrdToLibraryEntry(row);
      return {
        ...entry,
        shelf: shelfForEntry(entry),
        sourceSrdEntityId: row.sourceSrdEntityId,
      };
    }),
  ];

  return entries
    .filter((entry) => !entryIsVaultExcluded(entry, excludedIds))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterVaultEntries(
  entries: VaultCardEntry[],
  shelf: VaultShelf,
  query: string,
): VaultCardEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (shelf !== "all" && entry.shelf !== shelf) return false;
    if (!q) return true;
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.detail.toLowerCase().includes(q) ||
      entry.kindLabel.toLowerCase().includes(q)
    );
  });
}
