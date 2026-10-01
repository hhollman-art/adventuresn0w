"use client";

import type { SavedCampaign } from "@/lib/campaigns";
import { setActiveCampaignId } from "@/lib/campaigns";
import { useCallback, useEffect, useMemo } from "react";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import type { CiClass } from "@/lib/ciRegistry";
import ContainerDropZone from "@/features/vault/ContainerDropZone";
import CfContextMenu from "@/features/ui/CfContextMenu";
import {
  CAMPAIGN_BUILDER_ZONE_ICON,
  CAMPAIGN_BUILDER_ZONES,
  type CampaignBuilderZoneId,
} from "@/lib/campaignBuilder/zones";
import { buildCampaignZoneCards, type CampaignZoneCard } from "@/lib/campaignBuilder/zoneCards";
import { linkVaultPayloadToCampaign } from "@/lib/workshop/containerMoveWritePath";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { setVaultDragData, withContainerContext } from "@/lib/vault/cfDragDrop";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { emitAppToast } from "@/lib/ui/appToast";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import UnassignedLootPanel from "@/features/campaigns/UnassignedLootPanel";
import CampaignLibraryChessRail from "@/features/campaigns/CampaignLibraryChessRail";
import {
  categoryForCiClass,
  inspectCampaignCard,
  removeCampaignCard,
} from "@/features/campaigns/campaignCardActions";
import { useCampaignRelationships } from "@/features/campaigns/useCampaignRelationships";

const CANVAS_BG = "#0B0E14";
const PANEL_BORDER = "#30363D";
const TITLE_FG = "#F0F6FC";

type WorkspaceCard = CampaignZoneCard;

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
 * Campaign dashboard — five drop buckets. Membership is implicit by bucket:
 * drop a card in, click to inspect, Remove takes it out of the campaign only.
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

  useEffect(() => {
    setActiveCampaignId(campaign.id);
  }, [campaign.id]);

  const { relationships, addOptimistic } = useCampaignRelationships(campaign.id);

  const cardsByZone = useMemo(
    () =>
      buildCampaignZoneCards(
        campaign,
        { characters, parties, items, seeds, results, npcs, locations },
        relationships,
      ),
    [campaign, characters, items, locations, npcs, parties, relationships, results, seeds],
  );

  const onDropToZone = useCallback(
    (zoneId: CampaignBuilderZoneId) => async (payload: VaultDragPayload) => {
      const zone = CAMPAIGN_BUILDER_ZONES.find((z) => z.id === zoneId);
      if (!zone) return { ok: false, message: "Unknown bucket." };
      if (!payload.id || !payload.ciClass) {
        return { ok: false, message: "That card is missing an id or type." };
      }
      const result = await linkVaultPayloadToCampaign({
        campaignId: campaign.id,
        payload,
        preferredSlot: zone.slot,
      });
      if (!result.ok) {
        emitAppToast(result.error, "warn");
        onStatus(result.error);
        return { ok: false, message: result.error };
      }
      addOptimistic(result.relationship);
      emitAppToast(result.message, "success");
      onStatus(result.message);
      onChanged();
      return { ok: true, message: result.message };
    },
    [addOptimistic, campaign.id, onChanged, onStatus],
  );

  const zoneDropHandlers = useMemo(() => {
    const map = {} as Record<
      CampaignBuilderZoneId,
      (payload: VaultDragPayload) => Promise<{ ok: boolean; message?: string }>
    >;
    for (const zone of CAMPAIGN_BUILDER_ZONES) {
      map[zone.id] = onDropToZone(zone.id);
    }
    return map;
  }, [onDropToZone]);

  const removeFromBucket = useCallback(
    async (card: WorkspaceCard) => {
      const result = await removeCampaignCard(campaign.id, card);
      if (!result.ok) {
        emitAppToast(result.error, "warn");
        onStatus(result.error);
        return;
      }
      emitAppToast(`${card.title} removed from this campaign.`, "success");
      onStatus(result.message);
      onChanged();
    },
    [campaign.id, onChanged, onStatus],
  );

  const openInScrying = useCallback(
    (card: WorkspaceCard) => inspectCampaignCard(campaign.id, card),
    [campaign.id],
  );

  return (
    <div
      className="campaign-workspace mt-3 space-y-4 rounded-xl p-3 sm:p-4"
      style={{ background: CANVAS_BG }}
    >
      <header className="space-y-1">
        <h2 className="font-display text-lg font-semibold tracking-tight" style={{ color: TITLE_FG }}>
          Campaign buckets
        </h2>
        <p className="max-w-2xl text-xs leading-relaxed text-slate-400">
          Drag cards from the Lore Vault (or the search rail) into a bucket. Click a card to read
          it in the pop-out {PREVIEW_WINDOW}. Hover and press × to remove it from this campaign —
          your Library copy stays safe.
        </p>
      </header>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {CAMPAIGN_BUILDER_ZONES.map((zone) => {
            const cards = cardsByZone[zone.id];
            const icon = CAMPAIGN_BUILDER_ZONE_ICON[zone.id];
            return (
              <ContainerDropZone
                key={zone.id}
                zoneId={`campaign-${campaign.id}-${zone.id}`}
                label={zone.label}
                hint={zone.hint}
                icon={icon}
                accepts={zone.accepts}
                softAccept
                hideHeader
                className="flex min-h-[14rem] flex-col"
                panelClassName="border-[#30363D] bg-[#161B22]"
                onDropPayload={zoneDropHandlers[zone.id]}
              >
                <div
                  className="mb-2 flex items-start justify-between gap-2 border-b pb-2"
                  style={{ borderColor: PANEL_BORDER }}
                >
                  <div className="min-w-0">
                    <p
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"
                      style={{ color: TITLE_FG }}
                    >
                      <span aria-hidden="true">{icon}</span>
                      <span className="leading-snug">{zone.label}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{zone.hint}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-300"
                    style={{ background: CANVAS_BG, border: `1px solid ${PANEL_BORDER}` }}
                    aria-label={`${cards.length} cards`}
                  >
                    {cards.length}
                  </span>
                </div>

                {cards.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center text-center text-xs text-slate-500">
                    Drop cards here
                  </p>
                ) : (
                  <ul className="custom-scrollbar flex max-h-72 flex-1 flex-col gap-1.5 overflow-y-auto">
                    {cards.map((card) => (
                      <li key={`${zone.id}:${card.id}`}>
                        <CfContextMenu
                          target={{
                            id: card.id,
                            title: card.title,
                            ciClass: card.ciClass as CiClass,
                            category: categoryForCiClass(String(card.ciClass)),
                            provenance: card.relationship ? "srd" : "user",
                            detail: card.subtitle,
                          }}
                          onInspect={() => openInScrying(card)}
                          extraItems={[
                            {
                              id: "remove",
                              label: "Remove from campaign",
                              onSelect: () => void removeFromBucket(card),
                            },
                          ]}
                        >
                          {(bind) => (
                            <div
                              {...bind}
                              role="button"
                              tabIndex={0}
                              className="campaign-cf-card group relative rounded-md border px-2 py-1.5 text-xs transition-colors hover:border-amber-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-400"
                              style={{
                                background: CANVAS_BG,
                                borderColor: PANEL_BORDER,
                              }}
                              draggable={
                                (zone.id === "parties" || zone.id === "loot") && !card.relationship
                              }
                              onClick={() => openInScrying(card)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openInScrying(card);
                                }
                              }}
                              onDragStart={(e) => {
                                if ((zone.id !== "parties" && zone.id !== "loot") || card.relationship) return;
                                e.stopPropagation();
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
                                <div className="min-w-0 pr-1">
                                  <p className="truncate font-semibold" style={{ color: TITLE_FG }}>
                                    {card.title}
                                  </p>
                                  <p className="truncate text-[10px] text-slate-400">
                                    {card.subtitle}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="shrink-0 rounded px-1.5 py-0.5 text-sm leading-none text-slate-500 opacity-0 transition-opacity hover:bg-[#f85149]/15 hover:text-[#f85149] group-hover:opacity-100 group-focus-within:opacity-100"
                                  title="Remove from campaign"
                                  aria-label={`Remove ${card.title} from campaign`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void removeFromBucket(card);
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </CfContextMenu>
                      </li>
                    ))}
                  </ul>
                )}
              </ContainerDropZone>
            );
          })}
        </div>

        <CampaignLibraryChessRail characters={characters} items={items} seeds={seeds} />
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
