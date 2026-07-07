import {
  abilityMod,
  effectiveAbilities,
  effectiveAc,
  effectiveMaxHp,
  effectiveSpeed,
} from "@/lib/tabletop/character";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import type { DmmsVttExportMeta, FoundryExportBundle } from "./types";

/** Foundry dnd5e actor document — import via Actors directory → Import Data. */
export type FoundryActorExport = {
  name: string;
  type: "character" | "npc";
  img: string;
  system: FoundryDnd5eSystem;
  prototypeToken: FoundryPrototypeToken;
  items: FoundryItemExport[];
  effects: [];
  flags: {
    ddeasy: {
      characterId: string;
      exportedAt: string;
      playerName: string;
    };
  };
};

type FoundryDnd5eSystem = {
  abilities: Record<
    "str" | "dex" | "con" | "int" | "wis" | "cha",
    {
      value: number;
      proficient: 0 | 1;
      bonuses: { check: string; save: string };
      max: number | null;
    }
  >;
  attributes: {
    ac: { flat: number | null; calc: "default"; formula: string };
    hp: { value: number; max: number; temp: number; tempmax: number; formula: string };
    init: { bonus: string; ability: "dex"; roll: { min: null; max: null; mode: 0 } };
    movement: { walk: number; units: "ft" };
    senses: {
      darkvision: number;
      blindsight: number;
      tremorsense: number;
      truesight: number;
      units: "ft";
      special: string;
    };
    spellcasting: string;
  };
  details: {
    biography: { value: string; public: string };
    alignment: string;
    race: string;
    background: string;
    class: string;
    subclass: string;
    level: number;
    xp: { value: number };
  };
  traits: {
    size: "med";
    di: { value: [] };
    dr: { value: [] };
    dv: { value: [] };
    ci: { value: [] };
    languages: { value: string[]; custom: string };
  };
  skills: Record<string, { value: 0; ability: string; bonuses: { check: string; passive: string }; total: number }>;
  spells: {
    spell1: { value: number; max: number };
    spell2: { value: number; max: number };
    spell3: { value: number; max: number };
    spell4: { value: number; max: number };
    spell5: { value: number; max: number };
    spell6: { value: number; max: number };
    spell7: { value: number; max: number };
    spell8: { value: number; max: number };
    spell9: { value: number; max: number };
    pact: { value: number; max: number };
    spell0: { value: number; max: number };
  };
  currency: { pp: number; gp: number; ep: number; sp: number; cp: number };
};

type FoundryPrototypeToken = {
  name: string;
  displayName: 0 | 30 | 50;
  actorLink: boolean;
  width: number;
  height: number;
  texture: { src: string };
  disposition: -1 | 0 | 1;
  vision: boolean;
  randomImg: boolean;
};

export type FoundryItemExport = {
  name: string;
  type: "class" | "equipment" | "spell" | "feat";
  img?: string;
  system: Record<string, unknown>;
};

const FOUNDRY_SCHOOL_CODES: Record<string, string> = {
  abjuration: "abj",
  conjuration: "con",
  divination: "div",
  enchantment: "enc",
  evocation: "evo",
  illusion: "ill",
  necromancy: "nec",
  transmutation: "tra",
};

function buildAbilityBlock(scores: ReturnType<typeof effectiveAbilities>): FoundryDnd5eSystem["abilities"] {
  const keys = ["str", "dex", "con", "int", "wis", "cha"] as const;
  return Object.fromEntries(
    keys.map((key) => [
      key,
      {
        value: scores[key],
        proficient: 0 as const,
        bonuses: { check: "", save: "" },
        max: null,
      },
    ]),
  ) as FoundryDnd5eSystem["abilities"];
}

function buildSkills(scores: ReturnType<typeof effectiveAbilities>): FoundryDnd5eSystem["skills"] {
  const skillMap: Record<string, keyof typeof scores> = {
    acr: "dex",
    ani: "wis",
    arc: "int",
    ath: "str",
    dec: "cha",
    his: "int",
    ins: "wis",
    itm: "cha",
    inv: "int",
    med: "wis",
    nat: "int",
    prc: "wis",
    prf: "cha",
    per: "cha",
    rel: "int",
    slt: "dex",
    ste: "dex",
    sur: "wis",
  };
  return Object.fromEntries(
    Object.entries(skillMap).map(([skill, ability]) => [
      skill,
      {
        value: 0,
        ability,
        bonuses: { check: "", passive: "" },
        total: abilityMod(scores[ability]),
      },
    ]),
  ) as FoundryDnd5eSystem["skills"];
}

function buildClassItem(player: PlayerCharacter): FoundryItemExport {
  const identifier = player.className.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return {
    name: player.subclass ? `${player.className} (${player.subclass})` : player.className,
    type: "class",
    system: {
      levels: player.level,
      description: { value: `<p>${player.subclass || player.className}</p>` },
      identifier: identifier || "adventurer",
      hitDice: "d8",
      hd: { spent: 0, max: player.level },
    },
  };
}

function buildEquipmentItem(item: PlayerCharacter["items"][number]): FoundryItemExport {
  const bonusLines = Object.entries(item.bonuses)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${key}: ${value >= 0 ? "+" : ""}${value}`)
    .join(", ");
  const description = [item.notes, bonusLines ? `Bonuses: ${bonusLines}` : ""].filter(Boolean).join("\n\n");
  return {
    name: item.name,
    type: "equipment",
    system: {
      description: { value: description ? `<p>${description.replace(/\n/g, "<br>")}</p>` : "" },
      quantity: 1,
      weight: 0,
      price: { value: 0, denomination: "gp" },
      equipped: true,
      identified: true,
    },
  };
}

function buildSpellItem(spellId: string): FoundryItemExport | null {
  const spell = findSpellIndexEntry(spellId);
  if (!spell) return null;
  const school = FOUNDRY_SCHOOL_CODES[spell.school.toLowerCase()] ?? "evo";
  const components: string[] = [];
  if (spell.components.verbal) components.push("vocal");
  if (spell.components.somatic) components.push("somatic");
  if (spell.components.material) components.push("material");
  const description = [spell.description, spell.higherLevel ? `At Higher Levels: ${spell.higherLevel}` : ""]
    .filter(Boolean)
    .join("\n\n");
  return {
    name: spell.name,
    type: "spell",
    system: {
      level: spell.level,
      school,
      description: { value: `<p>${description.replace(/\n/g, "<br>")}</p>` },
      activation: { type: spell.castingTime.toLowerCase().includes("reaction") ? "reaction" : "action", cost: 1 },
      range: { value: spell.range, units: "ft" },
      duration: { value: spell.duration, units: spell.duration.toLowerCase().includes("instant") ? "inst" : "spec" },
      components: { vocal: spell.components.verbal, somatic: spell.components.somatic, material: spell.components.material },
      properties: components,
    },
  };
}

function biographyHtml(player: PlayerCharacter): string {
  const lines = [
    player.notes ? `<p>${player.notes.replace(/\n/g, "<br>")}</p>` : "",
    player.playerName ? `<p><em>Player:</em> ${player.playerName}</p>` : "",
    `<p><em>Exported from D&amp;D Easy</em></p>`,
  ].filter(Boolean);
  return lines.join("");
}

/** Convert one Tavern / VTT hero sheet into a Foundry dnd5e actor document. */
export function exportFoundryActorFromPlayer(
  player: PlayerCharacter,
  opts?: { type?: "character" | "npc" },
): FoundryActorExport {
  const scores = effectiveAbilities(player.abilities, player.items);
  const maxHp = effectiveMaxHp(player);
  const currentHp = player.currentHp != null ? Math.min(player.currentHp, maxHp) : maxHp;
  const exportedAt = new Date().toISOString();

  const spellItems = player.knownSpellIds
    .map((id) => buildSpellItem(id))
    .filter((item): item is FoundryItemExport => item !== null);

  const items: FoundryItemExport[] = [
    buildClassItem(player),
    ...player.items.map(buildEquipmentItem),
    ...spellItems,
  ];

  if (player.notes.trim()) {
    items.push({
      name: "DMMS Notes",
      type: "feat",
      system: {
        description: { value: biographyHtml(player) },
      },
    });
  }

  return {
    name: player.name,
    type: opts?.type ?? "character",
    img: "icons/svg/mystery-man.svg",
    system: {
      abilities: buildAbilityBlock(scores),
      attributes: {
        ac: { flat: effectiveAc(player), calc: "default", formula: "" },
        hp: { value: currentHp, max: maxHp, temp: 0, tempmax: 0, formula: "" },
        init: { bonus: "0", ability: "dex", roll: { min: null, max: null, mode: 0 } },
        movement: { walk: effectiveSpeed(player), units: "ft" },
        senses: { darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0, units: "ft", special: "" },
        spellcasting: player.className.toLowerCase(),
      },
      details: {
        biography: { value: biographyHtml(player), public: "" },
        alignment: player.alignment || "Unaligned",
        race: player.species || "Unknown",
        background: player.background || "",
        class: player.className || "Adventurer",
        subclass: player.subclass || "",
        level: player.level,
        xp: { value: 0 },
      },
      traits: {
        size: "med",
        di: { value: [] },
        dr: { value: [] },
        dv: { value: [] },
        ci: { value: [] },
        languages: { value: [], custom: "" },
      },
      skills: buildSkills(scores),
      spells: {
        spell0: { value: 0, max: 0 },
        spell1: { value: 0, max: 0 },
        spell2: { value: 0, max: 0 },
        spell3: { value: 0, max: 0 },
        spell4: { value: 0, max: 0 },
        spell5: { value: 0, max: 0 },
        spell6: { value: 0, max: 0 },
        spell7: { value: 0, max: 0 },
        spell8: { value: 0, max: 0 },
        spell9: { value: 0, max: 0 },
        pact: { value: 0, max: 0 },
      },
      currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    },
    prototypeToken: {
      name: player.name,
      displayName: 0,
      actorLink: true,
      width: 1,
      height: 1,
      texture: { src: "icons/svg/mystery-man.svg" },
      disposition: 1,
      vision: true,
      randomImg: false,
    },
    items,
    effects: [],
    flags: {
      ddeasy: {
        characterId: player.id,
        exportedAt,
        playerName: player.playerName,
      },
    },
  };
}

export function exportFoundryActorsFromPlayers(players: PlayerCharacter[]): FoundryActorExport[] {
  return players.map((player) => exportFoundryActorFromPlayer(player));
}

export type FoundryPartyBundle = FoundryExportBundle<{
  partyName: string;
  actors: FoundryActorExport[];
}>;

/** Wrap party actors with DMMS metadata for the Foundry party-import macro. */
export function exportFoundryPartyBundle(
  partyName: string,
  players: PlayerCharacter[],
): FoundryPartyBundle {
  const meta: DmmsVttExportMeta = {
    source: "ddeasy",
    version: 1,
    exportedAt: new Date().toISOString(),
    platform: "foundry",
    system: "dnd5e",
  };
  return {
    meta,
    data: {
      partyName,
      actors: exportFoundryActorsFromPlayers(players),
    },
  };
}

export function exportFoundryActorBundle(player: PlayerCharacter): FoundryExportBundle<FoundryActorExport> {
  return {
    meta: {
      source: "ddeasy",
      version: 1,
      exportedAt: new Date().toISOString(),
      platform: "foundry",
      system: "dnd5e",
    },
    data: exportFoundryActorFromPlayer(player),
  };
}
