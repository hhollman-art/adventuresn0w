/**
 * Turn AI-generated hero markdown into fully structured Character Container CFs
 * (SavedCharacter rows) — searchable in The Tavern, not flat text blocks.
 */

import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import {
  saveCharacterToLibrary,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { saveCharacterRoster } from "@/lib/tabletop/characterRoster";
import { validateSpellReference } from "@/lib/srd/spellValidation";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import { canKnowSpellAtLevel } from "@/lib/srd/classProgression";
import { emptyBonuses } from "@/lib/tabletop/character";
import { newId } from "@/lib/tabletop/session";
import type { CharacterItem, PlayerCharacter } from "@/lib/tabletop/types";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";

const SPELL_LINE =
  /(?:^|\n)\s*(?:[-*•]\s*)?(?:Spells?|Known spells?|Prepared spells?)\s*:\s*(.+)/gi;
const GEAR_LINE = /^\s*(?:[-*•]\s*)?Gear:\s*(.+)$/i;

function extractSpellNames(notes: string, markdownBlock: string): string[] {
  const names: string[] = [];
  const hay = `${notes}\n${markdownBlock}`;
  for (const match of hay.matchAll(SPELL_LINE)) {
    const list = match[1] ?? "";
    for (const part of list.split(/[,;]/)) {
      const name = part.replace(/\([^)]*\)/g, "").trim();
      if (name) names.push(name);
    }
  }
  // Also pick **Spell Name** style mentions near a Spells heading.
  const section = /##+\s*Spells?\b([\s\S]*?)(?=\n##+\s|\n###\s|$)/i.exec(hay);
  if (section?.[1]) {
    for (const line of section[1].split("\n")) {
      const bullet = /^\s*[-*•]\s+\*?\*?([^*\n(]+)/.exec(line);
      if (bullet?.[1]) names.push(bullet[1].trim());
    }
  }
  return names;
}

function extractGearItems(notes: string): { items: CharacterItem[]; restNotes: string } {
  const items: CharacterItem[] = [];
  const rest: string[] = [];
  for (const line of notes.split("\n")) {
    const m = GEAR_LINE.exec(line);
    if (m?.[1]) {
      const [namePart, ...noteParts] = m[1].split("—").map((s) => s.trim());
      const name = namePart?.replace(/^[-*•]\s*/, "").trim();
      if (name) {
        items.push({
          id: newId(),
          name,
          notes: noteParts.join(" — "),
          bonuses: emptyBonuses(),
          equipped: true,
          libraryItemId: null,
          sourceKind: "equipped-item",
        });
      }
      continue;
    }
    rest.push(line);
  }
  return { items, restNotes: rest.join("\n").trim() };
}

function hydrateSpells(
  player: PlayerCharacter,
  extraNames: string[],
): PlayerCharacter {
  const known = new Set(player.knownSpellIds);
  for (const name of extraNames) {
    const ref = validateSpellReference(name);
    if (!ref.valid || !ref.normalizedId) continue;
    const entry = findSpellIndexEntry(ref.normalizedId);
    const spellLevel = entry?.level ?? 0;
    if (
      !canKnowSpellAtLevel(
        player.level,
        player.className,
        player.subclass,
        spellLevel,
      )
    ) {
      continue;
    }
    known.add(ref.normalizedId);
  }
  const knownSpellIds = [...known];
  const preparedSpellIds = player.preparedSpellIds.filter((id) =>
    knownSpellIds.includes(id),
  );
  return { ...player, knownSpellIds, preparedSpellIds };
}

/** Structure one parsed AI hero into a complete PlayerCharacter CF payload. */
export function structureAiHero(
  player: Omit<PlayerCharacter, "tokenId"> & { tokenId?: string | null },
  sourceMarkdown = "",
): PlayerCharacter {
  const base: PlayerCharacter = {
    ...player,
    tokenId: player.tokenId ?? null,
    linkedModifiers: player.linkedModifiers ?? [],
    preparedSpellIds: player.preparedSpellIds ?? [],
    knownSpellIds: player.knownSpellIds ?? [],
    items: player.items ?? [],
  };
  const spellNames = extractSpellNames(base.notes, sourceMarkdown);
  const { items: gearFromNotes, restNotes } = extractGearItems(base.notes);
  const existingNames = new Set(base.items.map((i) => i.name.toLowerCase()));
  const mergedItems = [
    ...base.items,
    ...gearFromNotes.filter((g) => !existingNames.has(g.name.toLowerCase())),
  ];
  const withSpells = hydrateSpells(
    { ...base, notes: restNotes, items: mergedItems },
    spellNames,
  );
  return {
    ...withSpells,
    linkedModifiers: withSpells.linkedModifiers ?? [],
    preparedSpellIds: withSpells.preparedSpellIds ?? [],
    knownSpellIds: withSpells.knownSpellIds ?? [],
  };
}

export type InstantiateAiHeroesResult = {
  ok: true;
  characters: SavedCharacter[];
  rosterName: string;
  rosterId: string | null;
  message: string;
};

export type ParsedHeroPreview = {
  /** Stable index into the parsed roster (used for Scry Window checkboxes). */
  index: number;
  id: string;
  name: string;
  summary: string;
};

/** Preview heroes from AI markdown without writing storage (for Scry Window selection). */
export function previewAiHeroesFromMarkdown(markdown: string): {
  rosterName: string;
  heroes: ParsedHeroPreview[];
} {
  const parsed = parseCharactersMarkdown(markdown);
  return {
    rosterName: parsed.rosterName,
    heroes: parsed.players.map((p, index) => {
      const structured = structureAiHero(p, markdown);
      return {
        index,
        id: structured.id,
        name: structured.name,
        summary: [
          `Lv ${structured.level}`,
          structured.species,
          structured.className,
        ]
          .filter(Boolean)
          .join(" "),
      };
    }),
  };
}

/**
 * Parse AI markdown, save selected heroes as Character CFs in The Tavern library,
 * and optionally save the fellowship roster (selected heroes only).
 */
export async function instantiateAiHeroesFromMarkdown(
  markdown: string,
  opts?: {
    saveRoster?: boolean;
    source?: "workshop" | "created";
    /** When set, only these parsed indices are instantiated. */
    selectedIndices?: number[];
  },
): Promise<InstantiateAiHeroesResult | { ok: false; error: string }> {
  const parsed = parseCharactersMarkdown(markdown);
  if (parsed.players.length === 0) {
    return {
      ok: false,
      error:
        "Could not find any heroes. Each hero needs a ### heading under ## Characters.",
    };
  }

  const selected =
    opts?.selectedIndices && opts.selectedIndices.length > 0
      ? opts.selectedIndices
          .filter((i) => i >= 0 && i < parsed.players.length)
          .map((i) => parsed.players[i]!)
      : parsed.players;

  if (selected.length === 0) {
    return {
      ok: false,
      error: "Select at least one hero to save into The Tavern.",
    };
  }

  const structured = selected.map((p) => structureAiHero(p, markdown));
  let list: SavedCharacter[] = [];
  for (const player of structured) {
    list = await saveCharacterToLibrary({
      player,
      source: opts?.source === "created" ? "created" : "import",
    });
    const saved = list.find((c) => c.id === player.id) ?? list[0];
    if (saved) void autoLinkToActiveCampaign({ characterId: saved.id });
  }

  let rosterId: string | null = null;
  if (opts?.saveRoster !== false) {
    const rosters = await saveCharacterRoster({
      name: parsed.rosterName,
      markdown,
      source: "workshop",
      players: structured,
    });
    rosterId = rosters[0]?.id ?? null;
    if (rosterId) void autoLinkToActiveCampaign({ partyId: rosterId });
  }

  scheduleLibrarySnapshot();

  return {
    ok: true,
    characters: list,
    rosterName: parsed.rosterName,
    rosterId,
    message: `Instantiated ${structured.length} hero Character CF${structured.length === 1 ? "" : "s"} in The Tavern${
      rosterId ? ` and fellowship “${parsed.rosterName}”` : ""
    }.`,
  };
}
