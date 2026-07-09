/**
 * Reactive character-sheet validation — spells, prepared lists, and
 * level-gated features against SRD progression tables.
 */

import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import {
  canKnowSpellAtLevel,
  clampCharacterLevel,
  isFeatureAvailableAtLevel,
  maxSpellLevelForCharacter,
  summarizeLevelProgression,
  type LevelProgressionSummary,
} from "@/lib/srd/classProgression";
import { validateSpellReference } from "@/lib/srd/spellValidation";
import type { PlayerCharacter } from "@/lib/tabletop/types";

export type SpellLevelIssue = {
  spellId: string;
  spellName: string;
  spellLevel: number;
  reason: string;
};

export type CharacterLevelValidation = {
  ok: boolean;
  progression: LevelProgressionSummary;
  invalidKnown: SpellLevelIssue[];
  invalidPrepared: SpellLevelIssue[];
  /** Known spells that pass level + SRD checks. */
  allowedKnownIds: string[];
  /** Prepared spells that remain valid after pruning. */
  allowedPreparedIds: string[];
  messages: string[];
};

function spellLevelOf(id: string): { name: string; level: number } | null {
  const ref = validateSpellReference(id);
  if (!ref.valid || !ref.normalizedId) return null;
  const entry = findSpellIndexEntry(ref.normalizedId);
  return {
    name: ref.name ?? entry?.name ?? ref.normalizedId,
    level: entry?.level ?? 0,
  };
}

export function validateCharacterSpellLevels(options: {
  level: number;
  className: string;
  subclass?: string;
  knownSpellIds: readonly string[];
  preparedSpellIds?: readonly string[];
}): CharacterLevelValidation {
  const progression = summarizeLevelProgression(
    options.level,
    options.className,
    options.subclass ?? "",
  );
  const max = progression.maxSpellLevel;
  const invalidKnown: SpellLevelIssue[] = [];
  const allowedKnownIds: string[] = [];

  for (const id of options.knownSpellIds) {
    const ref = validateSpellReference(id);
    if (!ref.valid || !ref.normalizedId) {
      invalidKnown.push({
        spellId: id,
        spellName: id,
        spellLevel: -1,
        reason: ref.message ?? "Not in the bundled SRD spell list.",
      });
      continue;
    }
    const meta = spellLevelOf(ref.normalizedId);
    const spellLevel = meta?.level ?? 0;
    const name = meta?.name ?? ref.name ?? ref.normalizedId;
    if (!canKnowSpellAtLevel(progression.level, options.className, options.subclass ?? "", spellLevel)) {
      invalidKnown.push({
        spellId: ref.normalizedId,
        spellName: name,
        spellLevel,
        reason:
          max < 0
            ? `${options.className || "This class"} has no spellcasting at level ${progression.level}.`
            : spellLevel === 0
              ? `Cantrips require spellcasting — not available yet.`
              : `${name} is a level-${spellLevel} spell; at level ${progression.level} you can only use up to level-${max} spells.`,
      });
      continue;
    }
    allowedKnownIds.push(ref.normalizedId);
  }

  const knownSet = new Set(allowedKnownIds);
  const invalidPrepared: SpellLevelIssue[] = [];
  const allowedPreparedIds: string[] = [];
  for (const id of options.preparedSpellIds ?? []) {
    const ref = validateSpellReference(id);
    const normalized = ref.normalizedId ?? id;
    if (!knownSet.has(normalized)) {
      const meta = spellLevelOf(normalized);
      invalidPrepared.push({
        spellId: normalized,
        spellName: meta?.name ?? id,
        spellLevel: meta?.level ?? -1,
        reason: "Prepared spells must also be on the known list and legal for this level.",
      });
      continue;
    }
    allowedPreparedIds.push(normalized);
  }

  const messages: string[] = [];
  if (invalidKnown.length > 0) {
    messages.push(
      `${invalidKnown.length} known spell${invalidKnown.length === 1 ? "" : "s"} exceed this hero’s level or class rules.`,
    );
  }
  if (invalidPrepared.length > 0) {
    messages.push(
      `${invalidPrepared.length} prepared spell${invalidPrepared.length === 1 ? "" : "s"} were cleared as invalid.`,
    );
  }

  return {
    ok: invalidKnown.length === 0 && invalidPrepared.length === 0,
    progression,
    invalidKnown,
    invalidPrepared,
    allowedKnownIds,
    allowedPreparedIds,
    messages,
  };
}

/** Drop illegal known/prepared spells when level or class changes. */
export function pruneSpellsForLevel(
  character: Pick<
    PlayerCharacter,
    "level" | "className" | "subclass" | "knownSpellIds" | "preparedSpellIds"
  >,
): {
  knownSpellIds: string[];
  preparedSpellIds: string[];
  removed: SpellLevelIssue[];
} {
  const result = validateCharacterSpellLevels({
    level: character.level,
    className: character.className,
    subclass: character.subclass,
    knownSpellIds: character.knownSpellIds,
    preparedSpellIds: character.preparedSpellIds,
  });
  return {
    knownSpellIds: result.allowedKnownIds,
    preparedSpellIds: result.allowedPreparedIds,
    removed: [...result.invalidKnown, ...result.invalidPrepared],
  };
}

export function validateFeatureNotesAgainstLevel(
  characterLevel: number,
  notes: string,
): { ok: boolean; blockedLines: string[] } {
  const blockedLines: string[] = [];
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!isFeatureAvailableAtLevel(characterLevel, trimmed)) {
      blockedLines.push(trimmed);
    }
  }
  return { ok: blockedLines.length === 0, blockedLines };
}

export function formatSpellSlotsHint(
  level: number,
  className: string,
  subclass = "",
): string {
  const prog = summarizeLevelProgression(level, className, subclass);
  if (prog.casterKind === "none") {
    return `Level ${prog.level} ${className || "hero"} — no spell slots (Proficiency ${prog.proficiencyBonus >= 0 ? "+" : ""}${prog.proficiencyBonus}).`;
  }
  const parts: string[] = [];
  for (let i = 1; i <= 9; i += 1) {
    const n = prog.spellSlots[i] ?? 0;
    if (n > 0) parts.push(`${i}:${n}`);
  }
  const slotText = parts.length > 0 ? parts.join(" · ") : "none yet";
  return `Level ${prog.level} — max spell level ${Math.max(0, prog.maxSpellLevel)} · slots ${slotText} · Prof ${prog.proficiencyBonus >= 0 ? "+" : ""}${prog.proficiencyBonus}`;
}

export {
  clampCharacterLevel,
  maxSpellLevelForCharacter,
  summarizeLevelProgression,
};
