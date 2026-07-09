/**
 * Reactive Character Sheet modifier engine.
 *
 * When an item, race template, or linked Creation File (curse, blessing, etc.)
 * is equipped/active on a character, this engine recalculates abilities,
 * AC, HP, speed, initiative, passive Perception, and saving throws.
 *
 * Single write path: callers mutate the character JSON (equip/link), then
 * call `computeCharacterStats` — never patch derived numbers into storage.
 */

import type {
  AbilityScores,
  CharacterItem,
  CharacterModifier,
  ItemBonuses,
  ModifierSourceKind,
  ModifierTarget,
  PlayerCharacter,
} from "./types";
import {
  ABILITY_LIST,
  abilityMod,
  emptyBonuses,
  formatMod,
  proficiencyBonus,
} from "./character";

export type {
  CharacterModifier,
  ModifierSourceKind,
  ModifierTarget,
} from "./types";

export type ComputedAbilityBlock = {
  base: number;
  bonus: number;
  score: number;
  mod: number;
};

export type ComputedCharacterStats = {
  abilities: Record<keyof AbilityScores, ComputedAbilityBlock>;
  ac: { base: number; bonus: number; total: number };
  maxHp: { base: number; bonus: number; total: number };
  speed: { base: number; bonus: number; total: number };
  initiative: { abilityMod: number; bonus: number; total: number };
  passivePerception: { abilityMod: number; bonus: number; total: number };
  proficiencyBonus: number;
  savingThrows: Record<keyof AbilityScores, { mod: number; bonus: number; total: number }>;
  /** Active modifiers that contributed to this computation. */
  appliedModifiers: CharacterModifier[];
  /** Sum of all active ItemBonuses-shaped deltas. */
  bonusTotals: ItemBonuses;
};

export type CharacterModifierEngine = {
  /** Collect modifiers from equipped items + explicit linked CFs. */
  collectModifiers(character: PlayerCharacter): CharacterModifier[];
  /** Pure recompute — never writes to storage. */
  compute(character: PlayerCharacter, extra?: CharacterModifier[]): ComputedCharacterStats;
};

const ABILITY_KEYS: (keyof AbilityScores)[] = ["str", "dex", "con", "int", "wis", "cha"];

function clampAbility(score: number): number {
  return Math.min(30, Math.max(1, Math.round(score)));
}

function isItemEquipped(item: CharacterItem): boolean {
  return item.equipped !== false;
}

function sourceKindFromItem(item: CharacterItem): ModifierSourceKind {
  if (item.sourceKind) return item.sourceKind;
  const notes = item.notes.toLowerCase();
  if (notes.includes("curse")) return "curse";
  if (notes.includes("bless")) return "blessing";
  return "equipped-item";
}

/** Build modifiers from a character's inventory (equipped only). */
export function modifiersFromItems(items: CharacterItem[]): CharacterModifier[] {
  const out: CharacterModifier[] = [];
  for (const item of items) {
    if (!isItemEquipped(item)) continue;
    const kind = sourceKindFromItem(item);
    for (const { key } of [
      { key: "ac" as const },
      { key: "maxHp" as const },
      { key: "speed" as const },
      { key: "initiative" as const },
      { key: "passivePerception" as const },
      ...ABILITY_KEYS.map((k) => ({ key: k })),
    ]) {
      const value = item.bonuses[key] ?? 0;
      if (value === 0) continue;
      out.push({
        id: `${item.id}:${key}`,
        sourceKind: kind,
        sourceLabel: item.name || "Unnamed item",
        sourceCfId: item.libraryItemId ?? null,
        target: key,
        value,
        active: true,
        notes: item.notes || undefined,
      });
    }
  }
  return out;
}

export function collectCharacterModifiers(character: PlayerCharacter): CharacterModifier[] {
  const fromItems = modifiersFromItems(character.items);
  const linked = (character.linkedModifiers ?? []).filter((m) => m.active);
  return [...fromItems, ...linked];
}

function emptyBonusTotals(): ItemBonuses {
  return emptyBonuses();
}

function applyModifiersToBonuses(mods: CharacterModifier[]): ItemBonuses {
  const totals = emptyBonusTotals();
  for (const mod of mods) {
    if (!mod.active || mod.value === 0) continue;
    switch (mod.target) {
      case "ac":
        totals.ac += mod.value;
        break;
      case "maxHp":
        totals.maxHp += mod.value;
        break;
      case "speed":
        totals.speed += mod.value;
        break;
      case "initiative":
        totals.initiative += mod.value;
        break;
      case "passivePerception":
        totals.passivePerception += mod.value;
        break;
      case "str":
      case "dex":
      case "con":
      case "int":
      case "wis":
      case "cha":
        totals[mod.target] += mod.value;
        break;
      default:
        break;
    }
  }
  return totals;
}

export function computeCharacterStats(
  character: PlayerCharacter,
  extra: CharacterModifier[] = [],
): ComputedCharacterStats {
  const appliedModifiers = [...collectCharacterModifiers(character), ...extra].filter(
    (m) => m.active,
  );
  const bonusTotals = applyModifiersToBonuses(appliedModifiers);
  const abilities = {} as Record<keyof AbilityScores, ComputedAbilityBlock>;

  for (const key of ABILITY_KEYS) {
    const base = character.abilities[key];
    const bonus = bonusTotals[key];
    const score = clampAbility(base + bonus);
    abilities[key] = { base, bonus, score, mod: abilityMod(score) };
  }

  const saveBonus = (key: keyof AbilityScores): number => {
    let extraSave = 0;
    for (const mod of appliedModifiers) {
      if (mod.target === (`save-${key}` as ModifierTarget)) extraSave += mod.value;
    }
    return extraSave;
  };

  const savingThrows = {} as ComputedCharacterStats["savingThrows"];
  for (const key of ABILITY_KEYS) {
    const mod = abilities[key].mod;
    const bonus = saveBonus(key);
    savingThrows[key] = { mod, bonus, total: mod + bonus };
  }

  return {
    abilities,
    ac: {
      base: character.ac,
      bonus: bonusTotals.ac,
      total: Math.max(1, character.ac + bonusTotals.ac),
    },
    maxHp: {
      base: character.maxHp,
      bonus: bonusTotals.maxHp,
      total: Math.max(1, character.maxHp + bonusTotals.maxHp),
    },
    speed: {
      base: character.speed,
      bonus: bonusTotals.speed,
      total: Math.max(0, character.speed + bonusTotals.speed),
    },
    initiative: {
      abilityMod: abilities.dex.mod,
      bonus: bonusTotals.initiative,
      total: abilities.dex.mod + bonusTotals.initiative,
    },
    passivePerception: {
      abilityMod: abilities.wis.mod,
      bonus: bonusTotals.passivePerception,
      total: 10 + abilities.wis.mod + bonusTotals.passivePerception,
    },
    proficiencyBonus: proficiencyBonus(character.level),
    savingThrows,
    appliedModifiers,
    bonusTotals,
  };
}

export const defaultCharacterModifierEngine: CharacterModifierEngine = {
  collectModifiers: collectCharacterModifiers,
  compute: computeCharacterStats,
};

/** Helper for UI: "WIS −2 (Cursed Blade)". */
export function formatModifierLine(mod: CharacterModifier): string {
  const label =
    ABILITY_LIST.find((a) => a.key === mod.target)?.label ??
    mod.target.replace(/^save-/, "Save ").toUpperCase();
  return `${label} ${formatMod(mod.value)} (${mod.sourceLabel})`;
}

export {
  abilityMod,
  formatMod,
  proficiencyBonus,
  ABILITY_LIST,
};
