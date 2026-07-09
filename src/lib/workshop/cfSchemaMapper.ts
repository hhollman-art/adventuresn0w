/**
 * AI schema-mapping utility — Homebrew document → DMMS Creation File draft.
 *
 * Client helpers call `/api/generate-cf-from-homebrew`. The system prompt is
 * owned here so UI and route stay aligned. Parsing is defensive: blank fields
 * stay blank so the Fill-in Factory can offer "Complete with AI".
 */

import { emptyBonuses } from "@/lib/tabletop/character";
import type { ItemBonuses } from "@/lib/tabletop/types";
import type { GameItemKind, MagicRarity } from "@/lib/itemLibrary";
import type { CreateNewKind } from "@/lib/workshop/powerWorkspaceMachine";

export const CF_SCHEMA_MAP_SYSTEM_PROMPT =
  "Convert this raw text/image OCR into a structured DMMS Creation File schema. " +
  "Return ONLY valid JSON matching the requested schema. " +
  "Never invent paywalled Wizards of the Coast rules text. " +
  "If a field is unknown, use an empty string, null, or 0 — do not fabricate book content. " +
  "Treat the input as the DM's own homebrew / personal notes.";

export type CfMappedKind = "item" | "npc" | "character" | "spell" | "location" | "realm";

export type CfItemDraft = {
  kind: GameItemKind;
  name: string;
  itemType: string;
  rarity: MagicRarity | null;
  requiresAttunement: boolean;
  description: string;
  bonuses: ItemBonuses;
};

export type CfNpcDraft = {
  name: string;
  briefDescription: string;
  motivation: string;
  secrets: string;
  markdown: string;
  tags: string[];
};

export type CfCharacterDraft = {
  name: string;
  species: string;
  className: string;
  subclass: string;
  background: string;
  alignment: string;
  level: number;
  ac: number;
  maxHp: number;
  speed: number;
  notes: string;
  abilities: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
};

export type CfSpellDraft = {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
};

export type CfLocationDraft = {
  name: string;
  locationKind: string;
  markdown: string;
  timelineNotes: string;
};

export type CfRealmDraft = {
  titleHint: string;
  briefDescription: string;
  markdown: string;
};

export type CfMappedDraft =
  | { cfKind: "item"; draft: CfItemDraft }
  | { cfKind: "npc"; draft: CfNpcDraft }
  | { cfKind: "character"; draft: CfCharacterDraft }
  | { cfKind: "spell"; draft: CfSpellDraft }
  | { cfKind: "location"; draft: CfLocationDraft }
  | { cfKind: "realm"; draft: CfRealmDraft };

export type CfMapRequest = {
  /** Target CF shape. */
  targetKind: CfMappedKind;
  /** Locally extracted text (PDF/TXT) or empty for image-only. */
  extractedText: string;
  fileName?: string;
  /** Optional image data URL for vision OCR (png/jpeg only). */
  imageDataUrl?: string | null;
  /**
   * When true, fill blank fields from context (Complete with AI).
   * Partial draft is sent as `partial` so the model extrapolates gaps only.
   */
  completeMissing?: boolean;
  partial?: Record<string, unknown>;
};

export type CfMapResponse = {
  mapped: CfMappedDraft;
  model: string;
  rawJson: string;
};

const RARITIES: MagicRarity[] = [
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
];

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function parseRarity(v: unknown): MagicRarity | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const key = v.trim().toLowerCase().replace(/\s+/g, "-") as MagicRarity;
  return RARITIES.includes(key) ? key : null;
}

function parseBonuses(raw: unknown): ItemBonuses {
  const base = emptyBonuses();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof ItemBonuses)[]) {
    base[key] = asNumber(o[key], 0);
  }
  return base;
}

/** Strip markdown fences and locate the first JSON object/array. */
export function extractJsonPayload(markdown: string): string {
  const fenced = markdown.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = markdown.search(/[{[]/);
  if (start < 0) return markdown.trim();
  return markdown.slice(start).trim();
}

export function emptyItemDraft(): CfItemDraft {
  return {
    kind: "magic",
    name: "",
    itemType: "",
    rarity: null,
    requiresAttunement: false,
    description: "",
    bonuses: emptyBonuses(),
  };
}

export function emptyNpcDraft(): CfNpcDraft {
  return {
    name: "",
    briefDescription: "",
    motivation: "",
    secrets: "",
    markdown: "",
    tags: [],
  };
}

export function emptyCharacterDraft(): CfCharacterDraft {
  return {
    name: "",
    species: "",
    className: "",
    subclass: "",
    background: "",
    alignment: "",
    level: 1,
    ac: 10,
    maxHp: 8,
    speed: 30,
    notes: "",
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  };
}

export function emptySpellDraft(): CfSpellDraft {
  return {
    name: "",
    level: 0,
    school: "",
    castingTime: "",
    range: "",
    components: "",
    duration: "",
    description: "",
  };
}

export function emptyLocationDraft(): CfLocationDraft {
  return {
    name: "",
    locationKind: "site",
    markdown: "",
    timelineNotes: "",
  };
}

export function emptyRealmDraft(): CfRealmDraft {
  return {
    titleHint: "",
    briefDescription: "",
    markdown: "",
  };
}

/** Normalize model JSON into a typed CF draft. */
export function mapRawJsonToCfDraft(targetKind: CfMappedKind, raw: unknown): CfMappedDraft {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  switch (targetKind) {
    case "item": {
      const kindRaw = asString(o.kind, "magic").toLowerCase();
      const kind: GameItemKind = kindRaw === "equipment" ? "equipment" : "magic";
      return {
        cfKind: "item",
        draft: {
          kind,
          name: asString(o.name),
          itemType: asString(o.itemType ?? o.type),
          rarity: parseRarity(o.rarity),
          requiresAttunement: asBool(o.requiresAttunement),
          description: asString(o.description ?? o.markdown),
          bonuses: parseBonuses(o.bonuses),
        },
      };
    }
    case "npc":
      return {
        cfKind: "npc",
        draft: {
          name: asString(o.name),
          briefDescription: asString(o.briefDescription ?? o.description),
          motivation: asString(o.motivation),
          secrets: asString(o.secrets),
          markdown: asString(o.markdown),
          tags: Array.isArray(o.tags) ? o.tags.map((t) => String(t)) : [],
        },
      };
    case "character": {
      const ab = (o.abilities && typeof o.abilities === "object"
        ? o.abilities
        : {}) as Record<string, unknown>;
      return {
        cfKind: "character",
        draft: {
          name: asString(o.name),
          species: asString(o.species ?? o.race),
          className: asString(o.className ?? o.class),
          subclass: asString(o.subclass),
          background: asString(o.background),
          alignment: asString(o.alignment),
          level: asNumber(o.level, 1),
          ac: asNumber(o.ac, 10),
          maxHp: asNumber(o.maxHp ?? o.hp, 8),
          speed: asNumber(o.speed, 30),
          notes: asString(o.notes ?? o.description),
          abilities: {
            str: asNumber(ab.str, 10),
            dex: asNumber(ab.dex, 10),
            con: asNumber(ab.con, 10),
            int: asNumber(ab.int, 10),
            wis: asNumber(ab.wis, 10),
            cha: asNumber(ab.cha, 10),
          },
        },
      };
    }
    case "spell":
      return {
        cfKind: "spell",
        draft: {
          name: asString(o.name),
          level: asNumber(o.level, 0),
          school: asString(o.school),
          castingTime: asString(o.castingTime),
          range: asString(o.range),
          components: asString(o.components),
          duration: asString(o.duration),
          description: asString(o.description),
        },
      };
    case "location":
      return {
        cfKind: "location",
        draft: {
          name: asString(o.name),
          locationKind: asString(o.locationKind ?? o.kind, "site"),
          markdown: asString(o.markdown ?? o.description),
          timelineNotes: asString(o.timelineNotes),
        },
      };
    case "realm":
      return {
        cfKind: "realm",
        draft: {
          titleHint: asString(o.titleHint ?? o.name),
          briefDescription: asString(o.briefDescription ?? o.description),
          markdown: asString(o.markdown),
        },
      };
  }
}

export function schemaHintForKind(kind: CfMappedKind): string {
  switch (kind) {
    case "item":
      return JSON.stringify({
        kind: "equipment|magic",
        name: "",
        itemType: "",
        rarity: "common|uncommon|rare|very-rare|legendary|artifact|null",
        requiresAttunement: false,
        description: "",
        bonuses: {
          ac: 0,
          maxHp: 0,
          speed: 0,
          initiative: 0,
          passivePerception: 0,
          str: 0,
          dex: 0,
          con: 0,
          int: 0,
          wis: 0,
          cha: 0,
        },
      });
    case "npc":
      return JSON.stringify({
        name: "",
        briefDescription: "",
        motivation: "",
        secrets: "",
        markdown: "",
        tags: [],
      });
    case "character":
      return JSON.stringify({
        name: "",
        species: "",
        className: "",
        subclass: "",
        background: "",
        alignment: "",
        level: 1,
        ac: 10,
        maxHp: 8,
        speed: 30,
        notes: "",
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      });
    case "spell":
      return JSON.stringify({
        name: "",
        level: 0,
        school: "",
        castingTime: "",
        range: "",
        components: "",
        duration: "",
        description: "",
      });
    case "location":
      return JSON.stringify({
        name: "",
        locationKind: "site|settlement|dungeon|region|other",
        markdown: "",
        timelineNotes: "",
      });
    case "realm":
      return JSON.stringify({
        titleHint: "",
        briefDescription: "",
        markdown: "",
      });
  }
}

/** Build the user message for the Anthropic call (server uses this). */
export function buildCfMapUserMessage(req: CfMapRequest): string {
  const parts: string[] = [
    `Target Creation File kind: ${req.targetKind}`,
    `JSON schema shape:\n${schemaHintForKind(req.targetKind)}`,
  ];
  if (req.fileName) parts.push(`Source file name: ${req.fileName}`);
  if (req.completeMissing) {
    parts.push(
      "Mode: COMPLETE MISSING FIELDS ONLY. Keep every non-empty value from the partial draft. Fill blanks with plausible homebrew that fits the context.",
    );
    if (req.partial) {
      parts.push(`Partial draft JSON:\n${JSON.stringify(req.partial, null, 2)}`);
    }
  } else {
    parts.push("Mode: PARSE INTO SCHEMA. Prefer empty values over inventing book rules.");
  }
  const text = req.extractedText.trim();
  if (text) {
    parts.push(`Extracted text (local client read):\n---\n${text.slice(0, 48_000)}\n---`);
  } else if (req.imageDataUrl) {
    parts.push("No text layer — OCR / describe the attached image into the schema.");
  } else {
    parts.push("No source text provided.");
  }
  return parts.join("\n\n");
}

export function createNewKindToMapped(kind: CreateNewKind): CfMappedKind | null {
  switch (kind) {
    case "item":
      return "item";
    case "npc":
      return "npc";
    case "character":
      return "character";
    case "spell":
      return "spell";
    case "location":
      return "location";
    case "realm":
      return "realm";
    default:
      return null;
  }
}

/** True when the draft still has blank required-ish fields. */
export function draftHasBlankFields(mapped: CfMappedDraft): boolean {
  switch (mapped.cfKind) {
    case "item":
      return !mapped.draft.name.trim() || !mapped.draft.description.trim();
    case "npc":
      return !mapped.draft.name.trim() || !mapped.draft.briefDescription.trim();
    case "character":
      return !mapped.draft.name.trim() || !mapped.draft.className.trim();
    case "spell":
      return !mapped.draft.name.trim() || !mapped.draft.description.trim();
    case "location":
      return !mapped.draft.name.trim() || !mapped.draft.markdown.trim();
    case "realm":
      return !mapped.draft.titleHint.trim() || !mapped.draft.briefDescription.trim();
  }
}

/**
 * Call the AI proxy to map local extract → CF draft (or complete blanks).
 * Image data URLs are sent only when the DM opts into AI assistance.
 */
export async function mapHomebrewToCfSchema(req: CfMapRequest): Promise<CfMapResponse> {
  const res = await fetch("/api/generate-cf-from-homebrew", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetKind: req.targetKind,
      extractedText: req.extractedText,
      fileName: req.fileName,
      imageDataUrl: req.imageDataUrl ?? undefined,
      completeMissing: req.completeMissing ?? false,
      partial: req.partial,
    }),
  });
  const data = (await res.json()) as {
    error?: string;
    mapped?: CfMappedDraft;
    model?: string;
    rawJson?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? "AI mapping failed.");
  }
  if (!data.mapped || !data.rawJson) {
    throw new Error("AI returned an empty Creation File draft.");
  }
  return {
    mapped: data.mapped,
    model: data.model ?? "unknown",
    rawJson: data.rawJson,
  };
}

/** Partial object for Complete-with-AI (strip empty noise). */
export function draftToPartial(mapped: CfMappedDraft): Record<string, unknown> {
  return { ...mapped.draft } as Record<string, unknown>;
}
