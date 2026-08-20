"use client";

import { useCallback, useMemo, useState } from "react";
import type { SavedCampaign } from "@/lib/campaigns";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import { seedDisplayName } from "@/lib/realmSeeds";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import type { CiClass } from "@/lib/ciRegistry";
import { ciClassForGameItem, CI_CLASS_FOR_CHARACTER, CI_CLASS_FOR_PARTY } from "@/lib/ciRegistry";
import ContainerDropZone from "@/features/vault/ContainerDropZone";
import CfContextMenu from "@/features/ui/CfContextMenu";
import {
  CAMPAIGN_BUILDER_ZONES,
  type CampaignBuilderZoneId,
} from "@/lib/campaignBuilder/zones";
import {
  readAdventureChildIds,
  resolveAdventureChildren,
  type CampaignBuilderCatalog,
} from "@/lib/campaignBuilder/cascade";
import { detachCfFromCampaign } from "@/lib/campaignBuilder/attach";
import { dropIntoCampaignContainer } from "@/lib/workshop/containerMoveWritePath";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { setVaultDragData, withContainerContext } from "@/lib/vault/cfDragDrop";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { emitAppToast } from "@/lib/ui/appToast";
import { characterSummary } from "@/lib/tabletop/character";
import { GAME_ITEM_KIND_LABEL } from "@/lib/itemLibrary";
import { inspectEntity } from "@/lib/workshop/inspectedEntity";
import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { LibraryStorageCategory } from "@/lib/workshop/libraryCatalog";
import UnassignedLootPanel from "@/features/campaigns/UnassignedLootPanel";

type WorkspaceCard = {
  id: string;
  title: string;
  subtitle: string;
  ciClass: CiClass | string;
  zone: CampaignBuilderZoneId;
  /** Nested children when this is an adventure container. */
  children?: WorkspaceCard[];
};

function categoryForCiClass(ciClass: string): LibraryStorageCategory {
  if (ciClass.startsWith("seed.")) return "seeds";
  if (ciClass.startsWith("result.")) return "results";
  if (ciClass === "character.sheet") return "characters";
  if (ciClass.startsWith("item.")) return "items";
  if (ciClass === "party.roster") return "parties";
  if (ciClass === "npc.record" || ciClass === "location.record") return "world";
  if (ciClass === "monster.srd-entry") return "monsters";
  return "campaigns";
}

function selectionForCard(card: WorkspaceCard): LibraryViewSelection {
  if (card.ciClass === "monster.srd-entry" || card.id.startsWith("monster:")) {
    return { kind: "srd-entity", entityId: card.id as `monster:${string}`, name: card.title };
  }
  if (typeof card.ciClass === "string" && card.ciClass.startsWith("seed.")) {
    return { kind: "seed", id: card.id };
  }
  if (typeof card.ciClass === "string" && card.ciClass.startsWith("result.")) {
    return { kind: "result", id: card.id };
  }
  if (card.ciClass === "character.sheet") return { kind: "character", id: card.id };
  if (card.ciClass === "party.roster") return { kind: "party", id: card.id };
  if (card.ciClass === "item.equipment" || card.ciClass === "item.magic") {
    return { kind: "item", id: card.id };
  }
  if (card.ciClass === "npc.record") return { kind: "npc", id: card.id };
  if (card.ciClass === "location.record") return { kind: "location", id: card.id };
  return { kind: "campaign", id: card.id };
}

export type CampaignWorkspaceProps = {
  campaign: SavedCampaign;
  characters: SavedCharacter[];
  parties: SavedCharacterRoster[];
  items: SavedGameItem[];
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  npcs: SavedNpc[];
  locations: SavedLocation[];
  onChanged: () => void;
  onStatus: (message: string) => void;
};

/**
 * Modular Homebrew Campaign Builder — CF card grid with zone drop targets,
 * cascading adventure nesting, and detach-without-delete.
 */
export default function CampaignWorkspace({
  campaign,
  characters,
  parties,
  items,
  seeds,
  results,
  npcs,
  locations,
  onChanged,
  onStatus,
}: CampaignWorkspaceProps) {
  const { setDragging } = useVaultDrawer();
  const [expandedAdventures, setExpandedAdventures] = useState<Record<string, boolean>>({});

  const catalog: CampaignBuilderCatalog = useMemo(
    () => ({ characters, items, seeds, results, parties, npcs, locations }),
    [characters, items, seeds, results, parties, npcs, locations],
  );

  const cardsByZone = useMemo(() => {
    const map: Record<CampaignBuilderZoneId, WorkspaceCard[]> = {
      parties: [],
      adventures: [],
      locations: [],
      encounters: [],
      loot: [],
    };

    if (campaign.partyId) {
      const party = parties.find((p) => p.id === campaign.partyId);
      if (party) {
        map.parties.push({
          id: party.id,
          title: party.name,
          subtitle: `${party.players.length} hero${party.players.length === 1 ? "" : "es"}`,
          ciClass: CI_CLASS_FOR_PARTY,
          zone: "parties",
        });
      }
    }
    for (const c of characters.filter((ch) => campaign.characterIds.includes(ch.id))) {
      map.parties.push({
        id: c.id,
        title: c.player.name,
        subtitle: characterSummary(c.player),
        ciClass: CI_CLASS_FOR_CHARACTER,
        zone: "parties",
      });
    }

    const adventureSeeds = seeds.filter(
      (s) => campaign.seedIds.includes(s.id) && (s.kind === "adventure" || s.kind === "realm" || s.kind === "characters"),
    );
    const adventureResults = results.filter(
      (r) =>
        campaign.resultIds.includes(r.id) &&
        (r.kind === "adventure" || r.kind === "realm" || r.kind === "characters"),
    );
    for (const s of adventureSeeds) {
      const nested = resolveAdventureChildren(readAdventureChildIds(s), catalog).map((child) => ({
        id: child.id,
        title: child.title,
        subtitle: child.ciClass,
        ciClass: child.ciClass,
        zone: "adventures" as const,
      }));
      map.adventures.push({
        id: s.id,
        title: seedDisplayName(s),
        subtitle: s.briefDescription.trim() || "Adventure CF",
        ciClass: `seed.${s.kind}`,
        zone: "adventures",
        children: nested,
      });
    }
    for (const r of adventureResults) {
      const nested = resolveAdventureChildren(readAdventureChildIds(r), catalog).map((child) => ({
        id: child.id,
        title: child.title,
        subtitle: child.ciClass,
        ciClass: child.ciClass,
        zone: "adventures" as const,
      }));
      map.adventures.push({
        id: r.id,
        title: r.title,
        subtitle: "Adventure result",
        ciClass: `result.${r.kind}`,
        zone: "adventures",
        children: nested,
      });
    }

    for (const loc of locations.filter((l) => campaign.locationIds.includes(l.id))) {
      map.locations.push({
        id: loc.id,
        title: loc.name,
        subtitle: loc.locationKind,
        ciClass: "location.record",
        zone: "locations",
      });
    }
    for (const s of seeds.filter((row) => campaign.seedIds.includes(row.id) && row.kind === "maps")) {
      map.locations.push({
        id: s.id,
        title: seedDisplayName(s),
        subtitle: "Map CF",
        ciClass: "seed.maps",
        zone: "locations",
      });
    }
    for (const r of results.filter((row) => campaign.resultIds.includes(row.id) && row.kind === "maps")) {
      map.locations.push({
        id: r.id,
        title: r.title,
        subtitle: "Map result",
        ciClass: "result.maps",
        zone: "locations",
      });
    }

    for (const npc of npcs.filter((n) => campaign.npcIds.includes(n.id))) {
      map.encounters.push({
        id: npc.id,
        title: npc.name,
        subtitle: npc.briefDescription.trim() || "NPC",
        ciClass: "npc.record",
        zone: "encounters",
      });
    }
    for (const monsterId of campaign.monsterIds ?? []) {
      map.encounters.push({
        id: monsterId,
        title: monsterId.replace(/^monster:/, "").replace(/-/g, " "),
        subtitle: "Monster ref",
        ciClass: "monster.srd-entry",
        zone: "encounters",
      });
    }
    for (const s of seeds.filter((row) => campaign.seedIds.includes(row.id) && row.kind === "props")) {
      map.encounters.push({
        id: s.id,
        title: seedDisplayName(s),
        subtitle: "Encounter notes",
        ciClass: "seed.props",
        zone: "encounters",
      });
    }

    const lootIds = new Set([
      ...(campaign.unassignedLootIds ?? []),
      ...campaign.itemIds,
    ]);
    for (const item of items.filter((i) => lootIds.has(i.id))) {
      const inPool = (campaign.unassignedLootIds ?? []).includes(item.id);
      map.loot.push({
        id: item.id,
        title: item.name,
        subtitle: inPool
          ? `Loot pool · ${GAME_ITEM_KIND_LABEL[item.kind]}`
          : GAME_ITEM_KIND_LABEL[item.kind],
        ciClass: ciClassForGameItem(item.kind),
        zone: "loot",
      });
    }

    return map;
  }, [campaign, catalog, characters, items, locations, npcs, parties, results, seeds]);

  const onDropToZone = useCallback(
    (zoneId: CampaignBuilderZoneId) => async (payload: VaultDragPayload) => {
      const zone = CAMPAIGN_BUILDER_ZONES.find((z) => z.id === zoneId);
      if (!zone) return { ok: false, message: "Unknown zone." };
      const result = await dropIntoCampaignContainer({
        campaignId: campaign.id,
        payload,
        slot: zone.slot,
      });
      if (!result.ok) {
        emitAppToast(result.error, "warn");
        onStatus(result.error);
        return { ok: false, message: result.error };
      }
      emitAppToast(result.message, "success");
      onStatus(result.message);
      onChanged();
      return { ok: true, message: result.message };
    },
    [campaign.id, onChanged, onStatus],
  );

  const detach = useCallback(
    async (card: WorkspaceCard) => {
      const result = await detachCfFromCampaign({
        campaignId: campaign.id,
        ciClass: card.ciClass,
        id: card.id,
      });
      if (!result.ok) {
        emitAppToast(result.error, "warn");
        onStatus(result.error);
        return;
      }
      emitAppToast(`${card.title} detached from campaign.`, "success");
      onStatus(result.message);
      onChanged();
    },
    [campaign.id, onChanged, onStatus],
  );

  return (
    <div className="campaign-workspace mt-3 space-y-3">
      <p className="text-xs leading-relaxed text-slate-300">
        Homebrew Campaign Builder — drag CF cards from the Lore Vault into a zone, or use{" "}
        <strong className="text-slate-100">Send to Active Campaign</strong> from any card menu.
        Detaching removes the link only; Library originals stay safe.
      </p>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {CAMPAIGN_BUILDER_ZONES.map((zone) => (
          <ContainerDropZone
            key={zone.id}
            zoneId={`campaign-${campaign.id}-${zone.id}`}
            label={zone.label}
            hint={zone.hint}
            accepts={zone.accepts}
            className="min-h-[8rem] border-[var(--border)] bg-[var(--surface)]"
            onDropPayload={onDropToZone(zone.id)}
          >
            {cardsByZone[zone.id].length === 0 ? (
              <p className="text-xs text-slate-400">Drop CF cards here.</p>
            ) : (
              <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto custom-scrollbar">
                {cardsByZone[zone.id].map((card) => {
                  const isAdventure = zone.id === "adventures" && (card.children?.length ?? 0) > 0;
                  const open = expandedAdventures[card.id] !== false;
                  return (
                    <li key={`${zone.id}:${card.id}`}>
                      <CfContextMenu
                        target={{
                          id: card.id,
                          title: card.title,
                          ciClass: card.ciClass as CiClass,
                          category: categoryForCiClass(String(card.ciClass)),
                          provenance: "user",
                          detail: card.subtitle,
                        }}
                        onInspect={() => {
                          const selection = selectionForCard(card);
                          inspectEntity({
                            key: `campaign:${campaign.id}:${card.id}`,
                            label: card.title,
                            ciClass: card.ciClass as CiClass,
                            cfId: card.id.startsWith("monster:") ? null : card.id,
                            selection,
                          });
                        }}
                        extraItems={[
                          {
                            id: "detach",
                            label: "Detach from Campaign",
                            onSelect: () => void detach(card),
                          },
                        ]}
                      >
                        {(bind) => (
                          <div
                            {...bind}
                            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs"
                            draggable={zone.id === "parties" || zone.id === "loot"}
                            onDragStart={(e) => {
                              if (zone.id !== "parties" && zone.id !== "loot") return;
                              const payload = withContainerContext(
                                {
                                  vaultKind: "cf",
                                  id: card.id,
                                  ciClass: card.ciClass as CiClass,
                                  title: card.title,
                                  detail: card.subtitle,
                                },
                                {
                                  parentId: campaign.id,
                                  parentCiClass: "campaign.record",
                                  slot: zone.slot,
                                  holdKind: zone.id === "loot" ? "park" : "link",
                                },
                              );
                              setVaultDragData(e.dataTransfer, payload);
                              setDragging(payload);
                            }}
                            onDragEnd={() => setDragging(null)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-100">{card.title}</p>
                                <p className="truncate text-[10px] text-slate-400">{card.subtitle}</p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                {isAdventure ? (
                                  <button
                                    type="button"
                                    className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-slate-300"
                                    onClick={() =>
                                      setExpandedAdventures((prev) => ({
                                        ...prev,
                                        [card.id]: !(prev[card.id] !== false),
                                      }))
                                    }
                                  >
                                    {open ? "Collapse" : "Expand"}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-[var(--dmms-hp,#f85149)] hover:text-[var(--dmms-hp,#f85149)]"
                                  title="Detach from Campaign"
                                  onClick={() => void detach(card)}
                                >
                                  Detach
                                </button>
                              </div>
                            </div>
                            {isAdventure && open ? (
                              <ul className="mt-1.5 space-y-1 border-l-2 border-[var(--dmms-border-strong,#30363d)] pl-2">
                                {(card.children ?? []).map((child) => (
                                  <li
                                    key={`${card.id}:${child.id}`}
                                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1"
                                  >
                                    <p className="truncate font-medium text-slate-100">{child.title}</p>
                                    <p className="truncate text-[9px] text-slate-400">{child.subtitle}</p>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        )}
                      </CfContextMenu>
                    </li>
                  );
                })}
              </ul>
            )}
          </ContainerDropZone>
        ))}
      </div>

      <UnassignedLootPanel
        campaign={campaign}
        items={items}
        characters={characters}
        onChanged={onChanged}
      />
    </div>
  );
}
