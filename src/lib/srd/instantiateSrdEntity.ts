/**
 * SRD Instantiation Pipeline — hydrate static SRD references into local,
 * mutable Creation File instances for container relationships.
 *
 * Static SRD corpus (`gameplay_mechanics.json`, `fighter.json`, …) stays
 * read-only. Drops into Campaign / Character containers never link the global
 * entity id — they clone a payload with a unique `instanceId` and `_source: "SRD"`.
 */

import type { CiClass } from "@/lib/ciRegistry";
import {
  ciClassForSrdEntity,
  getSrdEntity,
  parseSrdEntityId,
} from "@/lib/srd/corpus";
import { resolveSrdEntityMarkdownSync } from "@/lib/srd/cloneSrdEntity";
import { srdEntityKindLabel } from "@/lib/srd/corpus";
import type { SrdEntityId, SrdEntityKind, SrdEntitySummary } from "@/lib/srd/types";
import { emptyBonuses } from "@/lib/tabletop/character";
import type {
  CharacterItem,
  CharacterModifier,
  ItemBonuses,
  ModifierSourceKind,
} from "@/lib/tabletop/types";
import type { GameItemKind, MagicRarity, SaveGameItemInput } from "@/lib/itemLibrary";

/** Provenance tag on every hydrated instance — never mutates the global SRD. */
export type SrdInstanceSource = "SRD";

/** Drag / library pointer at a read-only bundled SRD entity. */
export type StaticSRDReference = {
  kind: "static-srd";
  entityId: SrdEntityId;
  name: string;
  entityKind: SrdEntityKind;
  ciClass: CiClass;
};

/** Local mutable CF created from an SRD reference (container-owned). */
export type InstantiatedCF = {
  kind: "instantiated-cf";
  instanceId: string;
  _source: SrdInstanceSource;
  sourceSrdEntityId: SrdEntityId;
  name: string;
  ciClass: CiClass;
  /** Deep-copied payload for local edits. */
  payload: InstantiatedPayload;
};

export type InstantiatedPayload =
  | {
      target: "character-item";
      item: CharacterItem & {
        instanceId: string;
        _source: SrdInstanceSource;
        sourceSrdEntityId: SrdEntityId;
      };
    }
  | {
      target: "campaign-item";
      draft: SaveGameItemInput;
      instanceId: string;
      sourceSrdEntityId: SrdEntityId;
    }
  | {
      target: "spell";
      spellKey: string;
      markdown: string;
      item?: never;
    }
  | {
      target: "effect";
      modifier: CharacterModifier & {
        instanceId: string;
        _source: SrdInstanceSource;
      };
      markdown: string;
    }
  | {
      target: "rules";
      markdown: string;
    };

export type InstantiateTarget =
  | "character-item"
  | "campaign-item"
  | "spell"
  | "effect"
  | "rules"
  | "auto";

const ITEM_KINDS: readonly SrdEntityKind[] = [
  "equipment",
  "weapon",
  "armor",
  "magic-item",
];

function shortHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

/**
 * Stable-looking unique instance id, e.g. `instance_feat_alert_9a8b7c`.
 * Always unique per call (timestamp + random) so container edits never collide.
 */
export function makeSrdInstanceId(entityId: SrdEntityId): string {
  const parsed = parseSrdEntityId(entityId);
  const kind = parsed?.split(":")[0] ?? "srd";
  const key = (parsed?.split(":").slice(1).join(":") || "entity")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .slice(0, 32)
    .toLowerCase();
  const salt =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 6)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.slice(
          -6,
        );
  return `instance_${kind}_${key}_${salt || shortHash(entityId)}`;
}

export function isStaticSRDReference(value: unknown): value is StaticSRDReference {
  if (!value || typeof value !== "object") return false;
  const o = value as StaticSRDReference;
  return o.kind === "static-srd" && typeof o.entityId === "string" && !!parseSrdEntityId(o.entityId);
}

export function isInstantiatedCF(value: unknown): value is InstantiatedCF {
  if (!value || typeof value !== "object") return false;
  const o = value as InstantiatedCF;
  return (
    o.kind === "instantiated-cf" &&
    typeof o.instanceId === "string" &&
    o.instanceId.startsWith("instance_") &&
    o._source === "SRD" &&
    typeof o.sourceSrdEntityId === "string"
  );
}

/** True when a CharacterItem was hydrated from the SRD (local mutable copy). */
export function isSrdInstantiatedItem(
  item: CharacterItem,
): item is CharacterItem & {
  instanceId: string;
  _source: SrdInstanceSource;
  sourceSrdEntityId: SrdEntityId;
} {
  const row = item as CharacterItem & {
    _source?: string;
    sourceSrdEntityId?: string;
    instanceId?: string;
  };
  return (
    row._source === "SRD" &&
    typeof row.sourceSrdEntityId === "string" &&
    (typeof row.instanceId === "string" || item.id.startsWith("instance_"))
  );
}

/** Detect a vault/library drag that still points at a static SRD entity id. */
export function isStaticSrdDragId(id: string): boolean {
  return parseSrdEntityId(id) !== null && !id.startsWith("instance_");
}

export function toStaticSRDReference(
  entityId: string,
  name?: string,
): StaticSRDReference | null {
  const parsed = parseSrdEntityId(entityId);
  if (!parsed) return null;
  const entity = getSrdEntity(parsed);
  const kind = (entity?.kind ?? parsed.split(":")[0]) as SrdEntityKind;
  return {
    kind: "static-srd",
    entityId: parsed,
    name: name ?? entity?.name ?? parsed,
    entityKind: kind,
    ciClass: ciClassForSrdEntity(kind),
  };
}

function isItemKind(kind: SrdEntityKind): boolean {
  return (ITEM_KINDS as readonly string[]).includes(kind);
}

function resolveTarget(
  entity: SrdEntitySummary,
  requested: InstantiateTarget,
): Exclude<InstantiateTarget, "auto"> {
  if (requested !== "auto") return requested;
  if (isItemKind(entity.kind)) return "character-item";
  if (entity.kind === "spell") return "spell";
  if (entity.kind === "feat" || entity.kind === "condition" || entity.kind === "monster") {
    return "effect";
  }
  return "rules";
}

function itemDraftFromEntity(
  entity: SrdEntitySummary,
  markdown: string,
): SaveGameItemInput {
  const kind: GameItemKind = entity.kind === "magic-item" ? "magic" : "equipment";
  return {
    kind,
    name: entity.name,
    itemType: srdEntityKindLabel(entity.kind),
    rarity: null as MagicRarity | null,
    requiresAttunement: false,
    description: [
      markdown,
      "",
      `_source: SRD`,
      `sourceSrdEntityId: ${entity.id}`,
    ].join("\n"),
    bonuses: emptyBonuses() as ItemBonuses,
    source: "import",
  };
}

function characterItemFromEntity(
  entity: SrdEntitySummary,
  markdown: string,
  instanceId: string,
  equipped = true,
): CharacterItem & {
  instanceId: string;
  _source: SrdInstanceSource;
  sourceSrdEntityId: SrdEntityId;
} {
  return {
    id: instanceId,
    instanceId,
    name: entity.name,
    notes: [
      srdEntityKindLabel(entity.kind),
      `_source: SRD`,
      `sourceSrdEntityId: ${entity.id}`,
      markdown.slice(0, 4000),
    ].join("\n"),
    bonuses: emptyBonuses(),
    equipped,
    libraryItemId: null,
    sourceKind: "equipped-item",
    _source: "SRD",
    sourceSrdEntityId: entity.id,
  };
}

/**
 * Convert a static SRD reference into a local InstantiatedCF.
 * Pure / sync — does not write storage. Callers persist via container write path.
 */
export function instantiateSrdEntity(
  entityId: SrdEntityId | string,
  target: InstantiateTarget = "auto",
  opts?: { instanceId?: string; name?: string; equipped?: boolean },
): InstantiatedCF | null {
  const ref = toStaticSRDReference(entityId, opts?.name);
  if (!ref) return null;

  const entity = getSrdEntity(ref.entityId);
  if (!entity) {
    // Still hydrate a stub so drops never hard-link the global id.
    const instanceId = opts?.instanceId ?? makeSrdInstanceId(ref.entityId);
    const markdown = `# ${ref.name}\n\n_Instantiated from SRD reference \`${ref.entityId}\`._`;
    return {
      kind: "instantiated-cf",
      instanceId,
      _source: "SRD",
      sourceSrdEntityId: ref.entityId,
      name: ref.name,
      ciClass: ref.ciClass,
      payload: { target: "rules", markdown },
    };
  }

  const instanceId = opts?.instanceId ?? makeSrdInstanceId(entity.id);
  const markdown = resolveSrdEntityMarkdownSync(entity);
  const resolved = resolveTarget(entity, target);
  const ciClass = ciClassForSrdEntity(entity.kind);

  switch (resolved) {
    case "character-item":
      return {
        kind: "instantiated-cf",
        instanceId,
        _source: "SRD",
        sourceSrdEntityId: entity.id,
        name: entity.name,
        ciClass,
        payload: {
          target: "character-item",
          item: characterItemFromEntity(entity, markdown, instanceId, opts?.equipped ?? true),
        },
      };
    case "campaign-item":
      return {
        kind: "instantiated-cf",
        instanceId,
        _source: "SRD",
        sourceSrdEntityId: entity.id,
        name: entity.name,
        ciClass,
        payload: {
          target: "campaign-item",
          draft: itemDraftFromEntity(entity, markdown),
          instanceId,
          sourceSrdEntityId: entity.id,
        },
      };
    case "spell":
      return {
        kind: "instantiated-cf",
        instanceId,
        _source: "SRD",
        sourceSrdEntityId: entity.id,
        name: entity.name,
        ciClass: "spell.srd-entry",
        payload: {
          target: "spell",
          spellKey: entity.key,
          markdown,
        },
      };
    case "effect": {
      const modifier: CharacterModifier & {
        instanceId: string;
        _source: SrdInstanceSource;
      } = {
        id: instanceId,
        instanceId,
        _source: "SRD",
        sourceKind: "creation-file" as ModifierSourceKind,
        sourceLabel: entity.name,
        sourceCfId: instanceId,
        target: "wis",
        value: 0,
        active: true,
        notes: markdown.slice(0, 2000),
      };
      return {
        kind: "instantiated-cf",
        instanceId,
        _source: "SRD",
        sourceSrdEntityId: entity.id,
        name: entity.name,
        ciClass,
        payload: { target: "effect", modifier, markdown },
      };
    }
    case "rules":
      return {
        kind: "instantiated-cf",
        instanceId,
        _source: "SRD",
        sourceSrdEntityId: entity.id,
        name: entity.name,
        ciClass,
        payload: { target: "rules", markdown },
      };
  }
}

/** Infer instantiate target from a container slot. */
export function instantiateTargetForSlot(
  slot: "inventory" | "spells" | "effects" | "loot" | "general" | "scene" | string,
): InstantiateTarget {
  switch (slot) {
    case "inventory":
      return "character-item";
    case "loot":
      return "campaign-item";
    case "spells":
      return "spell";
    case "effects":
      return "effect";
    default:
      return "auto";
  }
}
