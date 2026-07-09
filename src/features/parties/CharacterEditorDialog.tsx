"use client";

import { useEffect, useState } from "react";
import {
  ABILITY_LIST,
  abilityMod,
  emptyBonuses,
  formatMod,
  proficiencyBonus,
  effectiveStatsForCharacter,
} from "@/lib/tabletop/character";
import type { AbilityScores, CharacterItem, PlayerCharacter } from "@/lib/tabletop/types";
import PreparedSpellsByLevel from "@/features/parties/PreparedSpellsByLevel";
import CharacterContainerSlots from "@/features/parties/CharacterContainerSlots";
import { formatModifierLine } from "@/lib/tabletop/modifierEngine";
import { newId } from "@/lib/tabletop/session";
import { linkModifierToCharacter } from "@/lib/workshop/cfCloneWritePath";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { vaultPayloadIsStaticSrd } from "@/lib/vault/cfDragDrop";
import {
  instantiateSrdEntity,
  isStaticSrdDragId,
} from "@/lib/srd/instantiateSrdEntity";
import {
  saveCharacterToLibrary,
  updateCharacterInLibrary,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";
import { gateFirstCustomCfSave } from "@/lib/workshop/firstSaveGate";
import {
  loadSavedGameItems,
  MAGIC_RARITY_LABEL,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import type { SingleCharacterLocks } from "@/lib/characterPrompt";
import {
  SrdClassSubclassFields,
  SrdSpellPicker,
  SrdSpeciesSelect,
} from "@/features/ui/SrdPickers";
import { fetchDnd5eList } from "@/lib/srd/dnd5eApi";
import { openSrdItemPreview } from "@/lib/srd/openSrdPreview";
import SrdMarkdownTextarea from "@/features/ui/SrdMarkdownTextarea";
import { allSpellsValid } from "@/lib/srd/spellValidation";
import {
  parseSrdItemRefFromNotes,
  srdItemRefFromApi,
  type SrdItemRef,
} from "@/lib/srd/srdItemRef";
import { srdItemRefKey } from "@/lib/ciRelationships";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
] as const;

type Draft = Omit<PlayerCharacter, "tokenId">;

function emptyDraft(): Draft {
  return {
    id: newId(),
    name: "",
    playerName: "",
    species: "",
    className: "",
    subclass: "",
    background: "",
    alignment: "",
    level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    ac: 10,
    maxHp: 10,
    speed: 30,
    notes: "",
    items: [],
    knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
    currentHp: null,
  };
}

function draftFrom(character: SavedCharacter): Draft {
  const { tokenId: _tokenId, ...rest } = character.player;
  return {
    ...rest,
    preparedSpellIds: rest.preparedSpellIds ?? [],
    linkedModifiers: rest.linkedModifiers ?? [],
    items: rest.items.map((i) => ({
      ...i,
      bonuses: { ...i.bonuses },
      equipped: i.equipped !== false,
    })),
  };
}

const DEFAULTS = emptyDraft();

/**
 * Everything the user filled in by hand becomes a lock the AI must keep.
 * Numeric fields count as "filled in" when changed from the blank-sheet
 * defaults (level 1, AC 10, HP 10, speed 30, all abilities 10).
 */
function locksFromDraft(draft: Draft): SingleCharacterLocks {
  const locks: SingleCharacterLocks = {};
  if (draft.name.trim()) locks.name = draft.name.trim();
  if (draft.species.trim()) locks.species = draft.species.trim();
  if (draft.className.trim()) locks.className = draft.className.trim();
  if (draft.subclass.trim()) locks.subclass = draft.subclass.trim();
  if (draft.background.trim()) locks.background = draft.background.trim();
  if (draft.alignment.trim()) locks.alignment = draft.alignment.trim();
  if (draft.level !== DEFAULTS.level) locks.level = draft.level;
  if (draft.ac !== DEFAULTS.ac) locks.ac = draft.ac;
  if (draft.maxHp !== DEFAULTS.maxHp) locks.maxHp = draft.maxHp;
  if (draft.speed !== DEFAULTS.speed) locks.speed = draft.speed;
  if (
    (Object.keys(draft.abilities) as (keyof AbilityScores)[]).some(
      (k) => draft.abilities[k] !== 10,
    )
  ) {
    locks.abilities = { ...draft.abilities };
  }
  const gear = draft.items.map((i) => i.name.trim()).filter(Boolean);
  if (gear.length) locks.gear = gear;
  if (draft.notes.trim()) locks.notes = draft.notes.trim();
  return locks;
}

/** Pull "Gear: item — note" lines out of parsed notes into item rows. */
function splitGearFromNotes(notes: string): {
  items: { name: string; notes: string }[];
  rest: string;
} {
  const items: { name: string; notes: string }[] = [];
  const rest: string[] = [];
  for (const line of notes.split("\n")) {
    const m = /^Gear\s*[:\-–—]\s*(.+)$/i.exec(line.trim());
    if (m) {
      const [name, ...noteParts] = m[1].split(/\s*[—–]\s*/);
      if (name?.trim()) items.push({ name: name.trim(), notes: noteParts.join(" — ").trim() });
    } else if (line.trim()) {
      rest.push(line.trim());
    }
  }
  return { items, rest: rest.join("\n") };
}

type CharacterEditorDialogProps = {
  /** When set, the dialog edits this character; otherwise it creates a new one. */
  character?: SavedCharacter | null;
  onClose: () => void;
  /** Called with the refreshed character list and a status message after saving. */
  onSaved: (characters: SavedCharacter[], message: string) => void;
};

export default function CharacterEditorDialog({
  character,
  onClose,
  onSaved,
}: CharacterEditorDialogProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    character ? draftFrom(character) : emptyDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiFlavor, setAiFlavor] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateWithAi = async () => {
    setAiBusy(true);
    setAiError(null);
    const locks = locksFromDraft(draft);
    try {
      const res = await fetch("/api/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flavor: aiFlavor, locks }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok || !data.markdown) {
        setAiError(data.error ?? "Generation failed. Please try again.");
        return;
      }
      const generated = parseCharactersMarkdown(data.markdown).players[0];
      if (!generated) {
        setAiError("The AI response could not be read as a hero. Please try again.");
        return;
      }
      const { items: gearItems, rest: newNotes } = splitGearFromNotes(generated.notes);
      setDraft((d) => {
        const keptGear = new Set(d.items.map((i) => i.name.trim().toLowerCase()));
        const addedItems = gearItems
          .filter((g) => !keptGear.has(g.name.toLowerCase()))
          .map((g) => ({ id: newId(), name: g.name, notes: g.notes, bonuses: emptyBonuses() }));
        return {
          ...d,
          name: locks.name ?? generated.name,
          species: locks.species ?? generated.species,
          className: locks.className ?? generated.className,
          subclass: locks.subclass ?? generated.subclass,
          background: locks.background ?? generated.background,
          alignment: locks.alignment ?? generated.alignment,
          level: locks.level ?? generated.level,
          ac: locks.ac ?? generated.ac,
          maxHp: locks.maxHp ?? generated.maxHp,
          speed: locks.speed ?? generated.speed,
          abilities: locks.abilities ?? generated.abilities,
          items: [...d.items, ...addedItems],
          notes: [d.notes.trim(), newNotes].filter(Boolean).join("\n"),
        };
      });
    } catch {
      setAiError("Could not reach the generator. Check your connection and try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setAbility = (key: keyof AbilityScores, value: number) =>
    setDraft((d) => ({ ...d, abilities: { ...d.abilities, [key]: value } }));

  const setNumber = (key: "level" | "ac" | "maxHp" | "speed", raw: string, fallback: number) => {
    const n = Number.parseInt(raw, 10);
    set(key, Number.isFinite(n) ? n : fallback);
  };

  const [libraryItems, setLibraryItems] = useState<SavedGameItem[]>([]);
  const [srdEquipment, setSrdEquipment] = useState<{ index: string; name: string }[]>([]);
  const [srdMagicItems, setSrdMagicItems] = useState<{ index: string; name: string }[]>([]);
  useEffect(() => {
    void loadSavedGameItems().then(setLibraryItems);
    void fetchDnd5eList("equipment").then(setSrdEquipment);
    void fetchDnd5eList("magic-items").then(setSrdMagicItems);
  }, []);

  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [...d.items, { id: newId(), name: "", notes: "", bonuses: emptyBonuses() }],
    }));

  /** Copy a library item into this sheet's gear (bonuses included). */
  const addLibraryItem = (item: SavedGameItem) => {
    const noteParts = [
      item.itemType,
      item.kind === "magic" && item.rarity ? MAGIC_RARITY_LABEL[item.rarity] : "",
      item.kind === "magic" && item.requiresAttunement ? "requires attunement" : "",
    ].filter(Boolean);
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          id: newId(),
          name: item.name,
          notes: noteParts.join(", "),
          bonuses: { ...item.bonuses },
          equipped: true,
          libraryItemId: item.id,
          sourceKind: "equipped-item",
        },
      ],
    }));
  };

  const onInventoryDrop = async (payload: VaultDragPayload) => {
    // Hydrate static SRD → local mutable embed (never link global entity id).
    if (
      vaultPayloadIsStaticSrd(payload) ||
      isStaticSrdDragId(payload.id) ||
      payload.ciClass === "item.srd-equipment" ||
      payload.ciClass === "item.srd-magic"
    ) {
      const inst = instantiateSrdEntity(payload.id, "character-item", {
        name: payload.title,
        equipped: true,
      });
      if (!inst || inst.payload.target !== "character-item") {
        return { ok: false, message: "Could not instantiate that SRD item." };
      }
      const embedded = inst.payload.item;
      if (
        draft.items.some(
          (i) =>
            i.sourceSrdEntityId === inst.sourceSrdEntityId ||
            i.instanceId === inst.instanceId,
        )
      ) {
        return { ok: false, message: `${inst.name} is already on this sheet.` };
      }
      setDraft((d) => ({ ...d, items: [...d.items, embedded] }));
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD (${inst.instanceId}).`,
      };
    }

    const item = libraryItems.find((i) => i.id === payload.id);
    if (!item) {
      return { ok: false, message: "Item not found in Library." };
    }
    if (draft.items.some((i) => i.libraryItemId === item.id)) {
      return { ok: false, message: `${item.name} is already on this sheet.` };
    }
    addLibraryItem(item);
    return { ok: true, message: `${item.name} added to inventory.` };
  };

  const onSpellDrop = async (payload: VaultDragPayload) => {
    if (vaultPayloadIsStaticSrd(payload) || isStaticSrdDragId(payload.id)) {
      const inst = instantiateSrdEntity(payload.id, "spell", { name: payload.title });
      if (!inst || inst.payload.target !== "spell") {
        return { ok: false, message: "Could not instantiate that SRD spell." };
      }
      const spellKey = inst.payload.spellKey;
      if (draft.knownSpellIds.includes(spellKey)) {
        return { ok: false, message: "Spell already known." };
      }
      setDraft((d) => ({
        ...d,
        knownSpellIds: [...d.knownSpellIds, spellKey],
        notes: `${d.notes.trim()}\n[instance:${inst.instanceId} _source:SRD spell:${spellKey}]`.trim(),
      }));
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD (${inst.instanceId}).`,
      };
    }

    const spellId = payload.id.includes(":")
      ? payload.id.split(":").slice(1).join(":") || payload.id
      : payload.id;
    if (draft.knownSpellIds.includes(spellId)) {
      return { ok: false, message: "Spell already known." };
    }
    setDraft((d) => ({
      ...d,
      knownSpellIds: [...d.knownSpellIds, spellId],
    }));
    return { ok: true, message: `${payload.title} added to known spells.` };
  };

  const onEffectDrop = async (payload: VaultDragPayload) => {
    if (vaultPayloadIsStaticSrd(payload) || isStaticSrdDragId(payload.id)) {
      const inst = instantiateSrdEntity(payload.id, "effect", { name: payload.title });
      if (!inst || inst.payload.target !== "effect") {
        return { ok: false, message: "Could not instantiate that SRD effect." };
      }
      const modifier = inst.payload.modifier;
      setDraft((d) => linkModifierToCharacter(d as PlayerCharacter, modifier) as Draft);
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD as an effect (${inst.instanceId}).`,
      };
    }

    setDraft((d) =>
      linkModifierToCharacter(d as PlayerCharacter, {
        sourceKind: "creation-file",
        sourceLabel: payload.title,
        sourceCfId: payload.id,
        target: "wis",
        value: 0,
        active: true,
        notes: `Linked from ${payload.ciClass}`,
      }) as Draft,
    );
    return { ok: true, message: `${payload.title} linked as an active effect.` };
  };

  /** Reference an SRD equipment or magic item (read-only Creation File (CF) — not copied to item storage). */
  const addSrdItem = (ref: SrdItemRef) => {
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          id: newId(),
          name: ref.name,
          notes: `srd-ref:${srdItemRefKey(ref)}`,
          bonuses: emptyBonuses(),
        },
      ],
    }));
  };

  const patchItem = (id: string, patch: Partial<Pick<CharacterItem, "name" | "notes">>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const removeItem = (id: string) =>
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const onSave = async () => {
    if (!draft.name.trim()) {
      setError("Give this hero a name first.");
      return;
    }
    if (draft.knownSpellIds.length > 0 && !allSpellsValid(draft.knownSpellIds)) {
      setError("One or more selected spells are not in the bundled SRD list.");
      return;
    }
    setSaving(true);
    setError(null);
    const cleaned: Draft = {
      ...draft,
      items: draft.items.filter((i) => i.name.trim() !== ""),
    };
    try {
      if (!character) {
        const allowed = await gateFirstCustomCfSave(cleaned.name.trim() || "new hero");
        if (!allowed) {
          setSaving(false);
          setError("Save cancelled — configure Arcane Vault storage to continue.");
          return;
        }
      }
      const list = character
        ? await updateCharacterInLibrary(character.id, cleaned)
        : await saveCharacterToLibrary({ player: cleaned, source: "created" });
      const saved = list.find((c) => c.id === cleaned.id) ?? list[0];
      if (saved) void autoLinkToActiveCampaign({ characterId: saved.id });
      scheduleLibrarySnapshot();
      onSaved(
        list,
        character
          ? `Saved changes to ${draft.name.trim()}.`
          : `${draft.name.trim()} added to your heroes.`,
      );
    } catch {
      setError("Could not save this hero. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-editor-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2
          id="character-editor-title"
          className="font-display text-lg font-bold text-[var(--text)]"
        >
          {character ? `Edit ${character.player.name}` : "Create a hero"}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Heroes live in your library on this device. Add one to a fellowship any time — the
          fellowship is what campaigns and the Virtual Table use.
        </p>

        <div
          className="mt-4 rounded-lg border p-3"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.06)" }}
        >
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">Create with AI</span>{" "}
              <span className="text-[var(--muted)]">
                — describe the hero below, fill in any fields you want to control, and AI
                creates everything you left blank.
              </span>
            </span>
          </label>
          {aiEnabled ? (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={aiFlavor}
                onChange={(e) => setAiFlavor(e.target.value)}
                rows={3}
                placeholder="Flavor — e.g. “A retired city guard turned reluctant treasure hunter, gruff but loyal, haunted by a debt to a smuggler.”"
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                aria-label="Hero flavor for AI"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generateWithAi()}
                  disabled={aiBusy}
                  className="btn btn-sm btn-accent"
                >
                  {aiBusy ? "Creating…" : "Create the rest with AI"}
                </button>
                <span className="text-[10px] text-[var(--muted)]">
                  Fields you set by hand are kept exactly. Review and edit before saving.
                </span>
              </div>
              {aiError ? (
                <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {aiError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Hero name</span>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Aria Windrunner"
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Player (optional)</span>
            <input
              value={draft.playerName}
              onChange={(e) => set("playerName", e.target.value)}
              placeholder="Who plays them"
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <SrdSpeciesSelect value={draft.species} onChange={(v) => set("species", v)} />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Level</span>
            <input
              type="number"
              min={1}
              max={20}
              value={draft.level}
              onChange={(e) => setNumber("level", e.target.value, 1)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <SrdClassSubclassFields
            className={draft.className}
            subclass={draft.subclass}
            onClassChange={(v) => set("className", v)}
            onSubclassChange={(v) => set("subclass", v)}
          />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Background</span>
            <input
              value={draft.background}
              onChange={(e) => set("background", e.target.value)}
              placeholder="Soldier"
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Alignment</span>
            <select
              value={draft.alignment}
              onChange={(e) => set("alignment", e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <option value="">—</option>
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-xs font-bold tracking-wide uppercase">
            Ability scores{" "}
            <span className="font-normal normal-case text-[var(--muted)]">
              (Prof {formatMod(proficiencyBonus(draft.level))})
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ABILITY_LIST.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">
                  {label}{" "}
                  <span className="font-normal text-[var(--muted)]">
                    {formatMod(abilityMod(draft.abilities[key]))}
                  </span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={draft.abilities[key]}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    setAbility(key, Number.isFinite(n) ? n : 10);
                  }}
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">AC</span>
            <input
              type="number"
              min={1}
              max={40}
              value={draft.ac}
              onChange={(e) => setNumber("ac", e.target.value, 10)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Max HP</span>
            <input
              type="number"
              min={1}
              max={999}
              value={draft.maxHp}
              onChange={(e) => setNumber("maxHp", e.target.value, 10)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Speed (ft)</span>
            <input
              type="number"
              min={0}
              max={200}
              value={draft.speed}
              onChange={(e) => setNumber("speed", e.target.value, 30)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
        </div>

        <CharacterContainerSlots
          characterId={draft.id}
          linkedModifiers={draft.linkedModifiers ?? []}
          onInventoryDrop={onInventoryDrop}
          onSpellDrop={onSpellDrop}
          onEffectDrop={onEffectDrop}
          inventoryChildren={
            <>
              <div className="mb-1 flex flex-wrap items-center justify-end gap-1">
                {libraryItems.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => {
                      const item = libraryItems.find((i) => i.id === e.target.value);
                      if (item) addLibraryItem(item);
                    }}
                    className="rounded border px-2 py-0.5 text-[10px] font-semibold"
                    style={{ borderColor: "var(--accent-dim)", background: "var(--bg)" }}
                    aria-label="Add gear from your item library"
                  >
                    <option value="">From item library…</option>
                    {libraryItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {srdEquipment.length > 0 || srdMagicItems.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) return;
                      const [resource, index] = raw.split(":");
                      if (resource !== "equipment" && resource !== "magic-items") return;
                      const list = resource === "equipment" ? srdEquipment : srdMagicItems;
                      const hit = list.find((i) => i.index === index);
                      if (hit) {
                        addSrdItem(srdItemRefFromApi(resource, hit.index, hit.name));
                      }
                    }}
                    className="rounded border px-2 py-0.5 text-[10px] font-semibold"
                    style={{ borderColor: "var(--accent-dim)", background: "var(--bg)" }}
                    aria-label="Add gear from the SRD catalogue"
                  >
                    <option value="">From SRD…</option>
                    {srdEquipment.length > 0 ? (
                      <optgroup label="SRD equipment">
                        {srdEquipment.map((i) => (
                          <option key={`eq-${i.index}`} value={`equipment:${i.index}`}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {srdMagicItems.length > 0 ? (
                      <optgroup label="SRD magic items">
                        {srdMagicItems.map((i) => (
                          <option key={`mi-${i.index}`} value={`magic-items:${i.index}`}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                ) : null}
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: "var(--accent-dim)" }}
                >
                  Add item
                </button>
              </div>
              {draft.items.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">
                  Drop gear here, or add from the lists. Stat bonuses recalculate when equipped.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {draft.items.map((item) => {
                    const srdRef = parseSrdItemRefFromNotes(item.notes, item.name);
                    return (
                      <li key={item.id} className="flex flex-wrap items-center gap-2">
                        <input
                          value={item.name}
                          onChange={(e) => patchItem(item.id, { name: e.target.value })}
                          placeholder="Item name"
                          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
                          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                          aria-label="Item name"
                        />
                        <input
                          value={item.notes}
                          onChange={(e) => patchItem(item.id, { notes: e.target.value })}
                          placeholder="Notes (optional)"
                          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
                          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                          aria-label="Item notes"
                        />
                        {srdRef ? (
                          <button
                            type="button"
                            onClick={() => openSrdItemPreview(srdRef)}
                            className="rounded border px-2 py-1 text-xs font-semibold text-[var(--accent)]"
                            style={{ borderColor: "var(--accent-dim)" }}
                            title={`Open ${srdRef.name} rules in the ${PREVIEW_WINDOW}`}
                          >
                            Rules
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded border px-2 py-1 text-xs text-red-800"
                          style={{ borderColor: "var(--border)" }}
                          aria-label={`Remove ${item.name || "item"}`}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          }
          spellChildren={
            <>
              <SrdSpellPicker
                className={draft.className}
                selectedIds={draft.knownSpellIds}
                onChange={(ids) => {
                  set("knownSpellIds", ids);
                  setDraft((d) => ({
                    ...d,
                    knownSpellIds: ids,
                    preparedSpellIds: d.preparedSpellIds.filter((id) => ids.includes(id)),
                  }));
                }}
              />
              <div className="mt-3">
                <h3 className="text-sm font-bold text-[var(--text)]">Prepared / Memorized</h3>
                <div className="mt-2">
                  <PreparedSpellsByLevel
                    knownSpellIds={draft.knownSpellIds}
                    preparedSpellIds={draft.preparedSpellIds}
                    onChangePrepared={(ids) => set("preparedSpellIds", ids)}
                  />
                </div>
              </div>
            </>
          }
        />

        {(() => {
          const live = effectiveStatsForCharacter({
            ...draft,
            tokenId: null,
          } as PlayerCharacter);
          const activeMods = live.appliedModifiers.filter((m) => m.value !== 0);
          if (activeMods.length === 0) return null;
          return (
            <div className="mt-4 rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-bold text-[var(--text)]">Active modifiers</h3>
              <p className="mt-1 text-xs text-[var(--text-soft)]">
                Equipped gear and linked Creation Files recalculate stats live (e.g. a curse can
                lower Wisdom).
              </p>
              <ul className="mt-2 space-y-1 text-xs text-[var(--text)]">
                {activeMods.map((mod) => (
                  <li key={mod.id}>{formatModifierLine(mod)}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--text-soft)]">
                Effective AC {live.ac.total} · HP {live.maxHp.total} · Init{" "}
                {formatMod(live.initiative.total)} · PP {live.passivePerception.total}
              </p>
            </div>
          );
        })()}

        <label className="mt-4 flex flex-col gap-1 text-xs">
          <span className="font-semibold">Notes</span>
          <SrdMarkdownTextarea
            value={draft.notes}
            onChange={(notes) => set("notes", notes)}
            rows={3}
            showInsertBar
            className="rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            placeholder="Features, languages, proficiencies, backstory…"
          />
        </label>

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
            {saving ? "Saving…" : character ? "Save changes" : "Create hero"}
          </button>
        </div>
      </div>
    </div>
  );
}
