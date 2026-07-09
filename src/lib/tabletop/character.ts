import type { AbilityScores, CharacterItem, ItemBonuses, PlayerCharacter } from "./types";
import { computeCharacterStats } from "./modifierEngine";

export const ABILITY_LIST: { key: keyof AbilityScores; label: string }[] = [
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha", label: "CHA" },
];

/** Bonus fields shown when editing an item on the character sheet. */
export const ITEM_BONUS_FIELDS: { key: keyof ItemBonuses; label: string; title?: string }[] = [
  { key: "ac", label: "AC", title: "Armor Class bonus" },
  { key: "maxHp", label: "HP", title: "Maximum hit points bonus" },
  { key: "speed", label: "Spd", title: "Speed bonus (feet)" },
  { key: "initiative", label: "Init", title: "Initiative bonus" },
  { key: "passivePerception", label: "PP", title: "Passive Perception bonus" },
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha", label: "CHA" },
];

export function emptyBonuses(): ItemBonuses {
  return {
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
  };
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** 5.2 proficiency bonus by character level: +2 at 1–4 up to +6 at 17–20. */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.min(20, Math.max(1, level)) - 1) / 4);
}

export function passivePerception(scores: AbilityScores): number {
  return 10 + abilityMod(scores.wis);
}

/** One-line summary like "Lv 5 Elf Wizard". */
export function characterSummary(p: PlayerCharacter): string {
  return ["Lv " + p.level, p.species, p.subclass, p.className].filter(Boolean).join(" ");
}

export function sumItemBonuses(items: CharacterItem[]): ItemBonuses {
  const total = emptyBonuses();
  for (const item of items) {
    if (item.equipped === false) continue;
    for (const { key } of ITEM_BONUS_FIELDS) {
      total[key] += item.bonuses[key] ?? 0;
    }
  }
  return total;
}

function clampAbility(score: number): number {
  return Math.min(30, Math.max(1, Math.round(score)));
}

export function effectiveAbilities(
  base: AbilityScores,
  items: CharacterItem[],
): AbilityScores {
  const b = sumItemBonuses(items);
  return {
    str: clampAbility(base.str + b.str),
    dex: clampAbility(base.dex + b.dex),
    con: clampAbility(base.con + b.con),
    int: clampAbility(base.int + b.int),
    wis: clampAbility(base.wis + b.wis),
    cha: clampAbility(base.cha + b.cha),
  };
}

/** Full reactive recompute including linked CF modifiers (curses, etc.). */
export function effectiveStatsForCharacter(player: PlayerCharacter) {
  return computeCharacterStats(player);
}

export function effectiveAc(player: PlayerCharacter): number {
  return computeCharacterStats(player).ac.total;
}

export function effectiveMaxHp(player: PlayerCharacter): number {
  return computeCharacterStats(player).maxHp.total;
}

export function effectiveSpeed(player: PlayerCharacter): number {
  return computeCharacterStats(player).speed.total;
}

export function effectiveInitiative(player: PlayerCharacter): number {
  return computeCharacterStats(player).initiative.total;
}

export function effectivePassivePerception(player: PlayerCharacter): number {
  return computeCharacterStats(player).passivePerception.total;
}
