"use client";

import type { ReactNode } from "react";
import ContainerDropZone from "@/features/vault/ContainerDropZone";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import type { CharacterModifier } from "@/lib/tabletop/types";

type CharacterContainerSlotsProps = {
  characterId: string;
  linkedModifiers: CharacterModifier[];
  onInventoryDrop: (
    payload: VaultDragPayload,
  ) => Promise<{ ok: boolean; message?: string } | void> | { ok: boolean; message?: string } | void;
  onSpellDrop: (
    payload: VaultDragPayload,
  ) => Promise<{ ok: boolean; message?: string } | void> | { ok: boolean; message?: string } | void;
  onEffectDrop: (
    payload: VaultDragPayload,
  ) => Promise<{ ok: boolean; message?: string } | void> | { ok: boolean; message?: string } | void;
  inventoryChildren?: ReactNode;
  spellChildren?: ReactNode;
  effectChildren?: ReactNode;
};

/**
 * Interactive Character CF container — drop zones for Inventory, Spells, Effects.
 * Parent owns draft rows and outbound drag of embedded gear.
 */
export default function CharacterContainerSlots({
  characterId,
  linkedModifiers,
  onInventoryDrop,
  onSpellDrop,
  onEffectDrop,
  inventoryChildren,
  spellChildren,
  effectChildren,
}: CharacterContainerSlotsProps) {
  return (
    <div className="mt-4 grid gap-3">
      <ContainerDropZone
        zoneId={`character-${characterId}-inventory`}
        label="Inventory"
        hint="Drop gear / magic items from the Lore Vault or Library"
        accepts={[
          "item.equipment",
          "item.magic",
          "item.srd-equipment",
          "item.srd-magic",
        ]}
        onDropPayload={onInventoryDrop}
      >
        {inventoryChildren}
      </ContainerDropZone>

      <ContainerDropZone
        zoneId={`character-${characterId}-spells`}
        label="Spells"
        hint="Drop spell CFs (SRD hydrates into a local instance)"
        accepts={["spell.srd-entry", "rules.srd-entry"]}
        onDropPayload={onSpellDrop}
      >
        {spellChildren}
      </ContainerDropZone>

      <ContainerDropZone
        zoneId={`character-${characterId}-effects`}
        label="Active effects"
        hint="Drop curses, blessings, feats, or custom rules (SRD → local instance)"
        accepts={[
          "rules.custom-entry",
          "rules.srd-entry",
          "monster.srd-entry",
          "spell.srd-entry",
        ]}
        onDropPayload={onEffectDrop}
      >
        {effectChildren}
        {linkedModifiers.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-[var(--text)]">
            {linkedModifiers.map((mod) => (
              <li key={mod.id}>
                {mod.sourceLabel}
                {!mod.active ? " (inactive)" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--text-soft)]">No linked effects yet.</p>
        )}
      </ContainerDropZone>
    </div>
  );
}
