"use client";

import { useCallback, useRef } from "react";
import type { SavedCampaign } from "@/lib/campaigns";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import type { CiClass } from "@/lib/ciRegistry";
import ContainerDropZone from "@/features/vault/ContainerDropZone";
import UnassignedLootPanel from "@/features/campaigns/UnassignedLootPanel";
import {
  dropIntoCampaignContainer,
  dropLootOntoCharacter,
} from "@/lib/workshop/containerMoveWritePath";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { setVaultDragData, withContainerContext } from "@/lib/vault/cfDragDrop";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { emitAppToast } from "@/lib/ui/appToast";
import { characterSummary } from "@/lib/tabletop/character";
import { seedDisplayName } from "@/lib/realmSeeds";
import { GAME_ITEM_KIND_LABEL } from "@/lib/itemLibrary";
import { ciClassForGameItem, CI_CLASS_FOR_CHARACTER } from "@/lib/ciRegistry";

const ITEM_ACCEPT: CiClass[] = [
  "item.equipment",
  "item.magic",
  "item.srd-equipment",
  "item.srd-magic",
];
const CHAR_ACCEPT: CiClass[] = ["character.sheet", "party.roster"];
const ADVENTURE_ACCEPT: CiClass[] = [
  "seed.realm",
  "seed.adventure",
  "seed.characters",
  "seed.maps",
  "seed.props",
  "result.adventure",
  "result.realm",
  "result.characters",
  "result.maps",
  "result.props",
];

/**
 * Multi-panel Campaign container layout — drop slots for Party, Adventure,
 * Loot, and Scene. Global parking / drag source is the Lore Vault.
 */
export default function CampaignContainerPanels({
  campaign,
  characters,
  items,
  seeds,
  onChanged,
  onStatus,
}: {
  campaign: SavedCampaign;
  characters: SavedCharacter[];
  items: SavedGameItem[];
  seeds: SavedRealmSeed[];
  onChanged: () => void;
  onStatus: (message: string) => void;
}) {
  const { setDragging } = useVaultDrawer();
  const campaignIdRef = useRef(campaign.id);
  campaignIdRef.current = campaign.id;
  const campaignNameRef = useRef(campaign.name);
  campaignNameRef.current = campaign.name;
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const dropToSlot = useCallback(
    (slot: "members" | "adventure" | "loot" | "scene" | "general") =>
      async (payload: VaultDragPayload) => {
        const result = await dropIntoCampaignContainer({
          campaignId: campaignIdRef.current,
          payload,
          slot,
        });
        if (!result.ok) {
          emitAppToast(result.error, "warn");
          onStatusRef.current(result.error);
          return { ok: false, message: result.error };
        }
        emitAppToast(`${payload.title} added to Campaign: ${campaignNameRef.current}`, "success");
        onStatusRef.current(result.message);
        onChangedRef.current();
        return { ok: true, message: result.message };
      },
    [],
  );

  const onPartyDrop = useCallback((p: VaultDragPayload) => dropToSlot("members")(p), [dropToSlot]);
  const onAdventureDrop = useCallback(
    (p: VaultDragPayload) => dropToSlot("adventure")(p),
    [dropToSlot],
  );
  const onLootDrop = useCallback((p: VaultDragPayload) => dropToSlot("loot")(p), [dropToSlot]);
  const onSceneDrop = useCallback((p: VaultDragPayload) => dropToSlot("scene")(p), [dropToSlot]);

  const linkedChars = characters.filter((c) => campaign.characterIds.includes(c.id));
  const lootItems = items.filter((i) => (campaign.unassignedLootIds ?? []).includes(i.id));
  const linkedSeeds = seeds.filter((s) => campaign.seedIds.includes(s.id));

  return (
    <div className="mt-3">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <ContainerDropZone
          zoneId={`campaign-${campaign.id}-party`}
          label="Party builder"
          hint="Drop heroes or a party roster"
          accepts={CHAR_ACCEPT}
          onDropPayload={onPartyDrop}
        >
          {linkedChars.length === 0 ? (
            <p className="text-xs text-[var(--text-soft)]">No linked heroes yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {linkedChars.map((c) => (
                <li
                  key={c.id}
                  draggable
                  className="cursor-grab rounded border px-2 py-1 text-xs active:cursor-grabbing"
                  style={{ borderColor: "var(--border)", background: "var(--panel)" }}
                  onDragStart={(e) => {
                    const payload = withContainerContext(
                      {
                        vaultKind: "cf",
                        id: c.id,
                        ciClass: CI_CLASS_FOR_CHARACTER,
                        title: c.player.name,
                        detail: characterSummary(c.player),
                      },
                      {
                        parentId: campaign.id,
                        parentCiClass: "campaign.record",
                        slot: "members",
                        holdKind: "link",
                      },
                    );
                    setVaultDragData(e.dataTransfer, payload);
                    setDragging(payload);
                  }}
                  onDragEnd={() => setDragging(null)}
                >
                  <span className="font-semibold text-[var(--text)]">{c.player.name}</span>
                  <span className="block text-[10px] text-[var(--text-soft)]">
                    {characterSummary(c.player)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ContainerDropZone>

        <ContainerDropZone
          zoneId={`campaign-${campaign.id}-adventure`}
          label="Adventure nodes"
          hint="Drop realm / adventure CFs"
          accepts={ADVENTURE_ACCEPT}
          onDropPayload={onAdventureDrop}
        >
          {linkedSeeds.length === 0 ? (
            <p className="text-xs text-[var(--text-soft)]">No adventure CFs linked.</p>
          ) : (
            <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {linkedSeeds.map((s) => (
                <li
                  key={s.id}
                  className="rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border)" }}
                >
                  {seedDisplayName(s)}
                </li>
              ))}
            </ul>
          )}
        </ContainerDropZone>

        <ContainerDropZone
          zoneId={`campaign-${campaign.id}-loot`}
          label="Reward / loot pool"
          hint="Drop items — then assign to heroes"
          accepts={ITEM_ACCEPT}
          onDropPayload={onLootDrop}
        >
          {lootItems.length === 0 ? (
            <p className="text-xs text-[var(--text-soft)]">Loot pool empty.</p>
          ) : (
            <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {lootItems.map((item) => (
                <li
                  key={item.id}
                  draggable
                  className="cursor-grab rounded border px-2 py-1 text-xs active:cursor-grabbing"
                  style={{ borderColor: "var(--border)", background: "var(--panel)" }}
                  onDragStart={(e) => {
                    const payload = withContainerContext(
                      {
                        vaultKind: "cf",
                        id: item.id,
                        ciClass: ciClassForGameItem(item.kind),
                        title: item.name,
                        detail: GAME_ITEM_KIND_LABEL[item.kind],
                      },
                      {
                        parentId: campaign.id,
                        parentCiClass: "campaign.record",
                        slot: "loot",
                        holdKind: "park",
                      },
                    );
                    setVaultDragData(e.dataTransfer, payload);
                    setDragging(payload);
                  }}
                  onDragEnd={() => setDragging(null)}
                  onDoubleClick={() => {
                    const hero = linkedChars[0];
                    if (!hero) {
                      onStatus("Link a hero before assigning loot.");
                      return;
                    }
                    void dropLootOntoCharacter({
                      campaignId: campaign.id,
                      libraryItemId: item.id,
                      characterId: hero.id,
                    }).then((r) => {
                      onStatus(r.ok ? r.message : r.error);
                      if (r.ok) onChanged();
                    });
                  }}
                >
                  <span className="font-semibold text-[var(--text)]">{item.name}</span>
                  <span className="block text-[10px] text-[var(--text-soft)]">
                    Drag to a hero sheet · double-click → first linked hero
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ContainerDropZone>

        <ContainerDropZone
          zoneId={`campaign-${campaign.id}-scene`}
          label="Active scene"
          hint="Drop NPCs, locations, or general CFs"
          onDropPayload={onSceneDrop}
        >
          <p className="text-xs text-[var(--text-soft)]">
            Drop NPCs or locations to link them to this campaign&apos;s scene.
          </p>
        </ContainerDropZone>

        <div className="sm:col-span-2">
          <UnassignedLootPanel
            campaign={campaign}
            items={items}
            characters={characters}
            onChanged={onChanged}
          />
        </div>
      </div>
    </div>
  );
}
