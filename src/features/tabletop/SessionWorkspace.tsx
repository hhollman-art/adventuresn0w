"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getActiveCampaignId,
  loadCampaigns,
  onActiveCampaignChanged,
  onCampaignsChanged,
  type SavedCampaign,
} from "@/lib/campaigns";
import { CHARACTERS_CHANGED_EVENT, loadSavedCharacters } from "@/lib/tabletop/characterLibrary";
import { loadSavedCharacterRosters } from "@/lib/tabletop/characterRoster";
import { ITEMS_CHANGED_EVENT, loadSavedGameItems } from "@/lib/itemLibrary";
import { loadRealmSeeds } from "@/lib/realmSeeds";
import { loadGenerationLibraryItems } from "@/lib/generationLibrary";
import { NPCS_CHANGED_EVENT, loadSavedNpcs } from "@/lib/worldAssets/npc";
import { loadSavedLocations } from "@/lib/worldAssets/location";
import {
  buildCampaignZoneCards,
  type CampaignZoneCard,
  type CampaignZoneCatalog,
} from "@/lib/campaignBuilder/zoneCards";
import { SESSION_ZONES, sessionZoneCards, type SessionZone } from "@/lib/tabletop/sessionZones";
import { linkVaultPayloadToCampaign } from "@/lib/workshop/containerMoveWritePath";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { emitAppToast } from "@/lib/ui/appToast";
import ContainerDropZone from "@/features/vault/ContainerDropZone";
import { inspectCampaignCard, removeCampaignCard } from "@/features/campaigns/campaignCardActions";
import { useCampaignRelationships } from "@/features/campaigns/useCampaignRelationships";

type SessionWorkspaceProps = {
  onStatus: (message: string) => void;
};

/**
 * Live Session containers for the active campaign — drop Lore Vault or Library
 * cards straight in while the table runs. Writes never open a dialog.
 */
export default function SessionWorkspace({ onStatus }: SessionWorkspaceProps) {
  const [campaign, setCampaign] = useState<SavedCampaign | null>(null);
  const [catalog, setCatalog] = useState<CampaignZoneCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const activeId = getActiveCampaignId();
    const [campaigns, characters, parties, items, seeds, results, npcs, locations] =
      await Promise.all([
        loadCampaigns(),
        loadSavedCharacters(),
        loadSavedCharacterRosters(),
        loadSavedGameItems(),
        loadRealmSeeds(),
        loadGenerationLibraryItems(),
        loadSavedNpcs(),
        loadSavedLocations(),
      ]);
    setCampaign(activeId ? (campaigns.find((c) => c.id === activeId) ?? null) : null);
    setCatalog({ characters, parties, items, seeds, results, npcs, locations });
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const reload = () => void refresh();
    const offCampaigns = onCampaignsChanged(reload);
    const offActive = onActiveCampaignChanged(reload);
    window.addEventListener(CHARACTERS_CHANGED_EVENT, reload);
    window.addEventListener(ITEMS_CHANGED_EVENT, reload);
    window.addEventListener(NPCS_CHANGED_EVENT, reload);
    return () => {
      offCampaigns();
      offActive();
      window.removeEventListener(CHARACTERS_CHANGED_EVENT, reload);
      window.removeEventListener(ITEMS_CHANGED_EVENT, reload);
      window.removeEventListener(NPCS_CHANGED_EVENT, reload);
    };
  }, [refresh]);

  const { relationships, addOptimistic } = useCampaignRelationships(campaign?.id ?? null);

  const cards = useMemo(
    () =>
      campaign && catalog
        ? sessionZoneCards(buildCampaignZoneCards(campaign, catalog, relationships))
        : null,
    [campaign, catalog, relationships],
  );

  const dropInto = useCallback(
    (zone: SessionZone) => async (payload: VaultDragPayload) => {
      if (!campaign) return { ok: false, message: "Open a campaign first." };
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
      void refresh();
      emitAppToast(result.message, "success");
      onStatus(result.message);
      return { ok: true, message: result.message };
    },
    [addOptimistic, campaign, onStatus, refresh],
  );

  const remove = useCallback(
    async (card: CampaignZoneCard) => {
      if (!campaign) return;
      const result = await removeCampaignCard(campaign.id, card);
      const message = result.ok ? `${card.title} removed from this campaign.` : result.error;
      emitAppToast(message, result.ok ? "success" : "warn");
      onStatus(message);
      if (result.ok) void refresh();
    },
    [campaign, onStatus, refresh],
  );

  if (!loaded) {
    return <p className="text-xs text-[var(--muted)]">Opening the campaign satchel&hellip;</p>;
  }

  if (!campaign || !cards) {
    return (
      <div className="space-y-2 text-xs leading-relaxed text-[var(--muted)]">
        <p className="font-semibold text-[var(--text)]">No campaign is open</p>
        <p>
          Open a campaign to keep its party, quests, loot, and NPCs here during play. Everything
          else on the table still works without one.
        </p>
        <Link href="/campaigns" className="btn btn-sm inline-flex">
          Go to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        <span className="font-semibold text-[var(--text)]">{campaign.name}</span> — drag cards from
        the Lore Vault or Library into a box. They link to the campaign right away.
      </p>
      {SESSION_ZONES.map((zone) => {
        const zoneCards = cards[zone.id];
        return (
          <ContainerDropZone
            key={zone.id}
            zoneId={`session-${campaign.id}-${zone.id}`}
            label={zone.label}
            hint={zone.hint}
            icon={zone.icon}
            softAccept
            compact
            hideHeader
            onDropPayload={dropInto(zone)}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold text-[var(--text)]">
                <span className="mr-1" aria-hidden="true">
                  {zone.icon}
                </span>
                {zone.label}
              </p>
              <span className="text-[10px] tabular-nums text-[var(--muted)]">{zoneCards.length}</span>
            </div>
            {zoneCards.length === 0 ? (
              <p className="text-[11px] text-[var(--muted)]">{zone.hint} — drop cards here.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {zoneCards.map((card) => (
                  <li
                    key={card.id}
                    className="group flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-1"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      title="Read it in the Scrying Glass"
                      onClick={() => inspectCampaignCard(campaign.id, card)}
                    >
                      <span className="block truncate text-xs font-semibold text-[var(--text)]">
                        {card.title}
                      </span>
                      <span className="block truncate text-[10px] text-[var(--muted)]">
                        {card.subtitle}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1 text-sm leading-none text-[var(--muted)] hover:text-[#b91c1c]"
                      title="Remove from campaign (Library copy stays)"
                      aria-label={`Remove ${card.title} from campaign`}
                      onClick={() => void remove(card)}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ContainerDropZone>
        );
      })}
    </div>
  );
}
