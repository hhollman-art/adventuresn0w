"use client";

import { useState } from "react";
import { ITEM_BONUS_FIELDS } from "@/lib/tabletop/character";
import type { ItemBonuses } from "@/lib/tabletop/types";
import {
  GAME_ITEM_KIND_LABEL,
  MAGIC_RARITIES,
  MAGIC_RARITY_LABEL,
  saveGameItem,
  updateGameItem,
  type GameItemKind,
  type MagicRarity,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import { emptyBonuses } from "@/lib/tabletop/character";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";

type Draft = {
  kind: GameItemKind;
  name: string;
  itemType: string;
  rarity: MagicRarity | null;
  requiresAttunement: boolean;
  description: string;
  bonuses: ItemBonuses;
};

function emptyDraft(kind: GameItemKind): Draft {
  return {
    kind,
    name: "",
    itemType: "",
    rarity: null,
    requiresAttunement: false,
    description: "",
    bonuses: emptyBonuses(),
  };
}

function draftFrom(item: SavedGameItem): Draft {
  return {
    kind: item.kind,
    name: item.name,
    itemType: item.itemType,
    rarity: item.rarity,
    requiresAttunement: item.requiresAttunement,
    description: item.description,
    bonuses: { ...item.bonuses },
  };
}

type ItemEditorDialogProps = {
  /** When set, the dialog edits this item; otherwise it creates a new one. */
  item?: SavedGameItem | null;
  /** Kind pre-selected for new items. */
  initialKind?: GameItemKind;
  onClose: () => void;
  /** Called with the refreshed item list and a status message after saving. */
  onSaved: (items: SavedGameItem[], message: string) => void;
};

export default function ItemEditorDialog({
  item,
  initialKind = "equipment",
  onClose,
  onSaved,
}: ItemEditorDialogProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    item ? draftFrom(item) : emptyDraft(initialKind),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setBonus = (key: keyof ItemBonuses, raw: string) => {
    const n = Number.parseInt(raw, 10);
    setDraft((d) => ({
      ...d,
      bonuses: { ...d.bonuses, [key]: Number.isFinite(n) ? n : 0 },
    }));
  };

  const onSave = async () => {
    if (!draft.name.trim()) {
      setError("Give this item a name first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const list = item
        ? await updateGameItem(item.id, draft)
        : await saveGameItem({ ...draft, source: "created" });
      const saved = item
        ? list.find((i) => i.id === item.id) ?? list[0]
        : list.find((i) => i.name === draft.name.trim()) ?? list[0];
      if (saved) void autoLinkToActiveCampaign({ itemId: saved.id });
      scheduleLibrarySnapshot();
      onSaved(
        list,
        item
          ? `Saved changes to ${draft.name.trim()}.`
          : `${draft.name.trim()} added to your items.`,
      );
    } catch {
      setError("Could not save this item. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-editor-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-full w-full max-w-xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 id="item-editor-title" className="font-display text-lg font-bold text-[var(--text)]">
          {item ? `Edit ${item.name}` : "Create an item"}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Items live in your library on this device. Add one to a hero&apos;s gear any
          time — the sheet gets its own copy, so editing here never silently changes a
          character.
        </p>

        <div
          className="mt-4 flex flex-wrap gap-1 rounded-lg border p-1"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          role="tablist"
          aria-label="Item kind"
        >
          {(Object.keys(GAME_ITEM_KIND_LABEL) as GameItemKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={draft.kind === kind}
              className={`btn btn-sm flex-1 ${draft.kind === kind ? "btn-accent" : ""}`}
              onClick={() => set("kind", kind)}
            >
              {GAME_ITEM_KIND_LABEL[kind]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Item name</span>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={draft.kind === "magic" ? "Flame Tongue" : "Longsword"}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Type</span>
            <input
              value={draft.itemType}
              onChange={(e) => set("itemType", e.target.value)}
              placeholder={draft.kind === "magic" ? "Weapon (any sword)" : "Martial weapon"}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          {draft.kind === "magic" ? (
            <>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">Rarity</span>
                <select
                  value={draft.rarity ?? ""}
                  onChange={(e) =>
                    set("rarity", (e.target.value || null) as MagicRarity | null)
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                >
                  <option value="">—</option>
                  {MAGIC_RARITIES.map((r) => (
                    <option key={r} value={r}>
                      {MAGIC_RARITY_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-1 text-xs">
                <input
                  type="checkbox"
                  checked={draft.requiresAttunement}
                  onChange={(e) => set("requiresAttunement", e.target.checked)}
                />
                <span className="font-semibold">Requires attunement</span>
              </label>
            </>
          ) : null}
        </div>

        <label className="mt-4 flex flex-col gap-1 text-xs">
          <span className="font-semibold">Description</span>
          <textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            placeholder={
              draft.kind === "magic"
                ? "What it does, in your own words. Properties from books you own stay private on this device."
                : "Weight, damage, properties, cost — whatever your table needs."
            }
            className="rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </label>

        <div className="mt-4">
          <p className="mb-1 text-xs font-bold tracking-wide uppercase">
            Stat bonuses{" "}
            <span className="font-normal normal-case text-[var(--muted)]">
              (applied when a character carries it — 0 means no change)
            </span>
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ITEM_BONUS_FIELDS.map(({ key, label, title }) => (
              <label key={key} className="flex flex-col gap-1 text-xs" title={title}>
                <span className="font-semibold">{label}</span>
                <input
                  type="number"
                  min={-99}
                  max={99}
                  value={draft.bonuses[key]}
                  onChange={(e) => setBonus(key, e.target.value)}
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="btn btn-sm btn-accent"
          >
            {saving ? "Saving…" : item ? "Save changes" : "Create item"}
          </button>
        </div>
      </div>
    </div>
  );
}
