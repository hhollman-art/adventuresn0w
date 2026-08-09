"use client";

import { useEffect, useState } from "react";
import {
  ARTIFACT_ITEM_TYPE_OPTIONS,
  ARTIFACT_SETTING_TAG_OPTIONS,
  parseCreateCustomArtifact,
} from "@/lib/itemArtifactSchema";
import { prepareItemArtDataUrl } from "@/lib/itemArtImage";
import {
  MAGIC_RARITIES,
  MAGIC_RARITY_LABEL,
  createCustomArtifact,
  type MagicRarity,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";
import { gateFirstCustomCfSave } from "@/lib/workshop/firstSaveGate";
import type { AuthSessionResponse } from "@/lib/auth/types";

type CreateArtifactModalProps = {
  onClose: () => void;
  onSaved: (items: SavedGameItem[], item: SavedGameItem, message: string) => void;
};

type FormState = {
  name: string;
  itemType: string;
  rarity: MagicRarity;
  requiresAttunement: boolean;
  attunementNote: string;
  description: string;
  properties: string;
  charges: string;
  effects: string;
  sourceNote: string;
  tagsText: string;
  settingTags: string[];
  imageDataUrl: string | null;
};

const EMPTY: FormState = {
  name: "",
  itemType: "Wondrous Item",
  rarity: "uncommon",
  requiresAttunement: false,
  attunementNote: "",
  description: "",
  properties: "",
  charges: "",
  effects: "",
  sourceNote: "",
  tagsText: "",
  settingTags: ["Homebrew"],
  imageDataUrl: null,
};

function parseTagsText(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function toggleTag(list: string[], tag: string): string[] {
  return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
}

export default function CreateArtifactModal({ onClose, onSaved }: CreateArtifactModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session")
      .then((res) => res.json() as Promise<AuthSessionResponse>)
      .then((data) => {
        if (cancelled || !data.session?.dm) return;
        const dm = data.session.dm;
        setCreatedBy(dm.username?.trim() || dm.email?.trim() || dm.id || null);
      })
      .catch(() => {
        /* offline / unauthenticated — createdBy stays null */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    setImageBusy(true);
    setError(null);
    try {
      const dataUrl = await prepareItemArtDataUrl(file);
      set("imageDataUrl", dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that image.");
    } finally {
      setImageBusy(false);
    }
  };

  const onSave = async () => {
    const payload = {
      name: form.name,
      itemType: form.itemType,
      rarity: form.rarity,
      requiresAttunement: form.requiresAttunement,
      attunementNote: form.attunementNote,
      description: form.description,
      properties: form.properties,
      charges: form.charges,
      effects: form.effects,
      sourceNote: form.sourceNote,
      tags: parseTagsText(form.tagsText),
      settingTags: form.settingTags,
      imageDataUrl: form.imageDataUrl,
      createdBy,
    };
    const validated = parseCreateCustomArtifact(payload);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const allowed = await gateFirstCustomCfSave(validated.data.name);
      if (!allowed) {
        setSaving(false);
        setError("Save cancelled — set your auto-save folder to keep this artifact.");
        return;
      }
      const { items, item } = await createCustomArtifact(validated.data);
      void autoLinkToActiveCampaign({ itemId: item.id });
      scheduleLibrarySnapshot();
      onSaved(items, item, `${item.name} is on your Items shelf.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this artifact.");
      setSaving(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-artifact-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 id="create-artifact-title" className="font-display text-lg font-bold text-[var(--text)]">
          Create custom artifact
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Add a homebrew magic item to your Library. It saves on this device with a{" "}
          <strong className="text-[var(--text)]">Homebrew</strong> badge and shows up in
          search and filters immediately — never uploaded to our servers.
        </p>

        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Basic info
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs sm:col-span-2">
              <span className="font-semibold">Item name</span>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Crown of Ember Crowns"
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Item type</span>
              <input
                list="artifact-item-types"
                value={form.itemType}
                onChange={(e) => set("itemType", e.target.value)}
                placeholder="Wondrous Item"
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
              <datalist id="artifact-item-types">
                {ARTIFACT_ITEM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Rarity</span>
              <select
                value={form.rarity}
                onChange={(e) => set("rarity", e.target.value as MagicRarity)}
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                {MAGIC_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {MAGIC_RARITY_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs sm:col-span-2">
              <input
                type="checkbox"
                checked={form.requiresAttunement}
                onChange={(e) => set("requiresAttunement", e.target.checked)}
              />
              <span className="font-semibold">Requires attunement</span>
            </label>
            {form.requiresAttunement ? (
              <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                <span className="font-semibold">Attunement note</span>
                <input
                  value={form.attunementNote}
                  onChange={(e) => set("attunementNote", e.target.value)}
                  placeholder="by a spellcaster, while wearing, …"
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              </label>
            ) : null}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Classification &amp; tags
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ARTIFACT_SETTING_TAG_OPTIONS.map((tag) => {
              const active = form.settingTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => set("settingTags", toggleTag(form.settingTags, tag))}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    background: active ? "rgba(201, 162, 39, 0.16)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text)",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Source</span>
              <input
                value={form.sourceNote}
                onChange={(e) => set("sourceNote", e.target.value)}
                placeholder="My realm codex, Session 12 notes…"
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Custom tags</span>
              <input
                value={form.tagsText}
                onChange={(e) => set("tagsText", e.target.value)}
                placeholder="fire, cursed, quest reward"
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </label>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Description &amp; mechanics
          </h3>
          <div className="mt-2 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="What the party sees and feels when they find it."
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Properties</span>
              <textarea
                value={form.properties}
                onChange={(e) => set("properties", e.target.value)}
                rows={2}
                placeholder="Weapon (longsword), +1 to attack and damage, Versatile…"
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">Charges</span>
                <input
                  value={form.charges}
                  onChange={(e) => set("charges", e.target.value)}
                  placeholder="3 charges; regain 1d3 at dawn"
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">Effects</span>
                <textarea
                  value={form.effects}
                  onChange={(e) => set("effects", e.target.value)}
                  rows={2}
                  placeholder="Spend 1 charge to cast… On a fail, …"
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Artwork
          </h3>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Optional picture from this computer. Stays in your Library backup — never sent to a
            server unless you use AI features separately.
          </p>
          <div className="mt-2 flex flex-wrap items-start gap-3">
            <label className="btn btn-sm cursor-pointer">
              {imageBusy ? "Preparing…" : form.imageDataUrl ? "Replace picture" : "Add picture"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={imageBusy || saving}
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
            </label>
            {form.imageDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageDataUrl}
                  alt="Artifact artwork preview"
                  className="h-20 w-20 rounded-md border object-cover"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => set("imageDataUrl", null)}
                >
                  Remove
                </button>
              </>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-sm" disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || imageBusy}
            className="btn btn-sm btn-accent"
          >
            {saving ? "Saving…" : "Save to Library"}
          </button>
        </div>
      </div>
    </div>
  );
}
