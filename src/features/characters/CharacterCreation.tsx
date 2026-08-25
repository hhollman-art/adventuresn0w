"use client";

import { useState, type ReactNode } from "react";
import CharacterSheetLayout from "@/features/characters/CharacterSheetLayout";
import {
  saveHeroToLibrary,
  addSavedHeroToActiveCampaign,
} from "@/lib/tabletop/saveHeroToLibrary";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { CreationFile } from "@/lib/creationFile/types";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import { getActiveCampaignId } from "@/lib/campaigns";
import { gateFirstCustomCfSave } from "@/lib/workshop/firstSaveGate";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";

export type CharacterCreationDraft = Omit<PlayerCharacter, "tokenId"> & {
  tokenId?: string | null;
};

export type CharacterCreationProps = {
  /** Live sheet draft from the editor form. */
  draft: CharacterCreationDraft;
  /** When editing an existing library hero. */
  existingId?: string | null;
  /** Form fields / editor body above the sticky save bar. */
  children: ReactNode;
  onCancel?: () => void;
  onSaved: (result: {
    character: SavedCharacter;
    card: CreationFile;
    characters: SavedCharacter[];
  }) => void;
  /** Show a live CharacterSheetLayout preview under the form. */
  showSheetPreview?: boolean;
  className?: string;
};

/**
 * Character Creation shell — one sticky primary action saves a Hero CF card
 * into characterLibrary and refreshes the Lore Vault immediately.
 */
export default function CharacterCreation({
  draft,
  existingId = null,
  children,
  onCancel,
  onSaved,
  showSheetPreview = false,
  className = "",
}: CharacterCreationProps) {
  const { refreshEntries } = useVaultDrawer();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<SavedCharacter | null>(null);
  const hasActiveCampaign = Boolean(getActiveCampaignId());

  const onSave = async () => {
    if (!draft.name.trim()) {
      setError("Give this hero a name first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!existingId) {
        const allowed = await gateFirstCustomCfSave(draft.name.trim() || "new hero");
        if (!allowed) {
          setSaving(false);
          setError("Save cancelled — set your auto-save folder once, then try again.");
          return;
        }
      }

      const result = await saveHeroToLibrary({
        player: { ...draft, tokenId: null },
        existingId,
        source: "created",
        linkActiveCampaign: false,
      });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }

      await refreshEntries();
      setLastSaved(result.character);
      onSaved({
        character: result.character,
        card: result.card,
        characters: result.characters,
      });
      setSaving(false);
    } catch {
      setError("Could not save this hero. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className={`character-creation flex min-h-0 flex-col ${className}`.trim()}>
      <div className="min-h-0 flex-1 overflow-y-auto pb-24">{children}</div>

      {showSheetPreview && draft.name.trim() ? (
        <div className="mt-4 border-t border-[#30363D] pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#F0F6FC]">
            Sheet preview
          </p>
          <CharacterSheetLayout characterData={{ ...draft, tokenId: null }} />
        </div>
      ) : null}

      {error ? (
        <p
          className="mx-1 mb-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {lastSaved && hasActiveCampaign ? (
        <div className="mx-1 mb-2 flex flex-wrap items-center gap-2 rounded border border-[#30363D] bg-[#161B22] px-3 py-2 text-xs text-slate-300">
          <span>
            <strong className="text-[#F0F6FC]">{lastSaved.player.name}</strong> is in your Library.
          </span>
          <button
            type="button"
            className="rounded border border-amber-400/50 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/10"
            onClick={() => void addSavedHeroToActiveCampaign(lastSaved)}
          >
            Add to Active Campaign
          </button>
        </div>
      ) : null}

      <div
        className="character-creation-save-bar sticky bottom-0 z-10 -mx-1 mt-auto flex flex-wrap items-center justify-end gap-2 border-t px-3 py-3"
        style={{
          borderColor: "#30363D",
          background: "linear-gradient(180deg, rgba(11,14,20,0.92), #0B0E14)",
        }}
      >
        {onCancel ? (
          <button type="button" onClick={onCancel} className="btn btn-sm">
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-md px-4 py-2.5 text-sm font-bold text-[#0B0E14] shadow-sm disabled:opacity-50"
          style={{ background: "#E3B341" }}
          data-testid="save-hero-to-library"
        >
          {saving
            ? "Saving…"
            : existingId
              ? "Save Hero to Library"
              : "Save Hero to Library"}
        </button>
      </div>
    </div>
  );
}
