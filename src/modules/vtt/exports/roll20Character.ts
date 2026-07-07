import {
  abilityMod,
  effectiveAbilities,
  effectiveAc,
  effectiveMaxHp,
  effectiveSpeed,
  formatMod,
  proficiencyBonus,
} from "@/lib/tabletop/character";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import type { DmmsVttExportMeta, FoundryExportBundle } from "./types";

/**
 * Roll20 character export for the free **D&D 5E by Roll20** sheet.
 * Import: create a character, open Attributes & Abilities → paste via API or Transmogrifier.
 * Targets Roll20; no premium modules required.
 */
export type Roll20Attribute = {
  name: string;
  current: string;
  max: string;
};

export type Roll20CharacterExport = {
  name: string;
  avatar: string;
  bio: string;
  gmnotes: string;
  inittoken: boolean;
  attributes: Roll20Attribute[];
};

const ABILITY_ATTRS = [
  { key: "strength", scoreKey: "str" },
  { key: "dexterity", scoreKey: "dex" },
  { key: "constitution", scoreKey: "con" },
  { key: "intelligence", scoreKey: "int" },
  { key: "wisdom", scoreKey: "wis" },
  { key: "charisma", scoreKey: "cha" },
] as const;

function attr(name: string, current: string | number, max: string | number = ""): Roll20Attribute {
  return { name, current: String(current), max: String(max) };
}

/** Map one hero sheet to Roll20 attribute rows. */
export function exportRoll20CharacterFromPlayer(player: PlayerCharacter): Roll20CharacterExport {
  const scores = effectiveAbilities(player.abilities, player.items);
  const maxHp = effectiveMaxHp(player);
  const currentHp = player.currentHp != null ? Math.min(player.currentHp, maxHp) : maxHp;
  const prof = proficiencyBonus(player.level);

  const attributes: Roll20Attribute[] = [
    attr("character_name", player.name),
    attr("player_name", player.playerName),
    attr("race", player.species),
    attr("class", player.className),
    attr("subclass", player.subclass),
    attr("background", player.background),
    attr("alignment", player.alignment),
    attr("level", player.level),
    attr("npc", "0"),
    attr("ac", effectiveAc(player)),
    attr("hp", currentHp, maxHp),
    attr("hp_max", maxHp),
    attr("speed", effectiveSpeed(player)),
    attr("proficiency_bonus", formatMod(prof)),
    attr("passive_wisdom", 10 + abilityMod(scores.wis)),
  ];

  for (const { key, scoreKey } of ABILITY_ATTRS) {
    const score = scores[scoreKey];
    attributes.push(attr(key, score, score));
    attributes.push(attr(`${key}_mod`, formatMod(abilityMod(score))));
    attributes.push(attr(`${key}_bonus`, 0));
    attributes.push(attr(`${key}_save_bonus`, formatMod(abilityMod(score))));
  }

  if (player.items.length) {
    const gear = player.items.map((item) => item.name).join(", ");
    attributes.push(attr("gear", gear));
  }

  if (player.knownSpellIds.length) {
    attributes.push(attr("spell_list", player.knownSpellIds.join(", ")));
  }

  const bio = [
    player.notes,
    player.playerName ? `Player: ${player.playerName}` : "",
    "Exported from D&D Easy",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    name: player.name,
    avatar: "",
    bio,
    gmnotes: `DMMS id: ${player.id}`,
    inittoken: true,
    attributes,
  };
}

export type Roll20PartyBundle = FoundryExportBundle<{
  partyName: string;
  characters: Roll20CharacterExport[];
}>;

export function exportRoll20PartyBundle(
  partyName: string,
  players: PlayerCharacter[],
): Roll20PartyBundle {
  const meta: DmmsVttExportMeta = {
    source: "ddeasy",
    version: 1,
    exportedAt: new Date().toISOString(),
    platform: "roll20",
    system: "dnd5e",
  };
  return {
    meta,
    data: {
      partyName,
      characters: players.map(exportRoll20CharacterFromPlayer),
    },
  };
}

export function exportRoll20CharacterBundle(
  player: PlayerCharacter,
): FoundryExportBundle<Roll20CharacterExport> {
  return {
    meta: {
      source: "ddeasy",
      version: 1,
      exportedAt: new Date().toISOString(),
      platform: "roll20",
      system: "dnd5e",
    },
    data: exportRoll20CharacterFromPlayer(player),
  };
}
