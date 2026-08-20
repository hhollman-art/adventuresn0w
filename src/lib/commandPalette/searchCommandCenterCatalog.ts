import { loadCampaigns } from "@/lib/campaigns";
import { loadGenerationLibraryItems } from "@/lib/generationLibrary";
import { loadSavedGameItems } from "@/lib/itemLibrary";
import { loadRealmSeeds, seedDisplayName } from "@/lib/realmSeeds";
import { searchSrdEntities } from "@/lib/srd/corpus";
import { openSrdEntityPreview } from "@/lib/srd/openSrdPreview";
import { loadSavedCharacters } from "@/lib/tabletop/characterLibrary";
import { loadSavedNpcs } from "@/lib/worldAssets/npc";
import { queuePendingLibrarySelection } from "@/lib/commandPalette/commandPaletteEvents";
import type { CommandPaletteItem } from "@/lib/commandPalette/commandPaletteRegistry";
import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";

const CF_LIMIT = 8;
const SRD_LIMIT = 8;

function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return haystack.toLowerCase().includes(q);
}

function cfItem(
  id: string,
  label: string,
  hint: string,
  selection: LibraryViewSelection,
  router: { push: (href: string) => void },
): CommandPaletteItem {
  return {
    id,
    label,
    category: "creation-files",
    keywords: [label, hint],
    hint,
    icon: "\u{1F4C4}",
    run: () => {
      queuePendingLibrarySelection(selection);
      router.push("/library");
    },
  };
}

export async function searchCommandCenterCatalog(
  query: string,
  router: { push: (href: string) => void },
): Promise<CommandPaletteItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [seeds, results, characters, items, npcs, campaigns] = await Promise.all([
    loadRealmSeeds(),
    loadGenerationLibraryItems(),
    loadSavedCharacters(),
    loadSavedGameItems(),
    loadSavedNpcs(),
    loadCampaigns(),
  ]);

  const files: CommandPaletteItem[] = [];

  for (const seed of seeds) {
    const title = seedDisplayName(seed);
    if (!matchesQuery(`${title} ${seed.kind}`, q)) continue;
    files.push(cfItem(`cf-seed-${seed.id}`, title, "Creation File — seed", { kind: "seed", id: seed.id }, router));
    if (files.length >= CF_LIMIT) break;
  }
  if (files.length < CF_LIMIT) {
    for (const item of results) {
      if (!matchesQuery(`${item.title} ${item.kind}`, q)) continue;
      files.push(
        cfItem(`cf-result-${item.id}`, item.title || "Untitled result", "Creation File — result", {
          kind: "result",
          id: item.id,
        }, router),
      );
      if (files.length >= CF_LIMIT) break;
    }
  }
  if (files.length < CF_LIMIT) {
    for (const character of characters) {
      const name = character.player.name?.trim() || "Hero";
      if (!matchesQuery(name, q)) continue;
      files.push(
        cfItem(`cf-character-${character.id}`, name, "Creation File — hero", {
          kind: "character",
          id: character.id,
        }, router),
      );
      if (files.length >= CF_LIMIT) break;
    }
  }
  if (files.length < CF_LIMIT) {
    for (const item of items) {
      if (!matchesQuery(item.name, q)) continue;
      files.push(
        cfItem(`cf-item-${item.id}`, item.name, "Creation File — item", { kind: "item", id: item.id }, router),
      );
      if (files.length >= CF_LIMIT) break;
    }
  }
  if (files.length < CF_LIMIT) {
    for (const npc of npcs) {
      if (!matchesQuery(npc.name, q)) continue;
      files.push(cfItem(`cf-npc-${npc.id}`, npc.name, "Creation File — NPC", { kind: "npc", id: npc.id }, router));
      if (files.length >= CF_LIMIT) break;
    }
  }
  if (files.length < CF_LIMIT) {
    for (const campaign of campaigns) {
      if (!matchesQuery(campaign.name, q)) continue;
      files.push(
        cfItem(`cf-campaign-${campaign.id}`, campaign.name, "Creation File — campaign", {
          kind: "campaign",
          id: campaign.id,
        }, router),
      );
      if (files.length >= CF_LIMIT) break;
    }
  }

  const srdHits = searchSrdEntities(q, { limit: SRD_LIMIT }).map((entity) => ({
    id: `srd-${entity.id}`,
    label: entity.name,
    category: "srd" as const,
    keywords: [entity.name, entity.kind, entity.subtitle ?? ""],
    hint: `Included rules — ${entity.kind.replace(/-/g, " ")}`,
    icon: "\u{1F4D6}",
    run: () => {
      queuePendingLibrarySelection({
        kind: "srd-entity",
        entityId: entity.id,
        name: entity.name,
      });
      openSrdEntityPreview(entity.id);
      router.push("/library");
    },
  }));

  return [...files, ...srdHits];
}
