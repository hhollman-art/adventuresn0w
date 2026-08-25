/**
 * Turn AI-generated hero markdown into Character Creation File (CF) cards
 * and persist them through characterLibrary — Vault-ready, sheet-renderable.
 */

import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import {
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { saveHeroToLibrary } from "@/lib/tabletop/saveHeroToLibrary";
import { saveCharacterRoster } from "@/lib/tabletop/characterRoster";
import { validateSpellReference } from "@/lib/srd/spellValidation";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import { canKnowSpellAtLevel } from "@/lib/srd/classProgression";
import { emptyBonuses } from "@/lib/tabletop/character";
import { newId } from "@/lib/tabletop/session";
import type { CharacterItem, PlayerCharacter } from "@/lib/tabletop/types";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";
import { emitAppToast } from "@/lib/ui/appToast";
import { characterToCreationFile } from "@/lib/creationFile/adapters";
import type { CreationFile } from "@/lib/creationFile/types";
import { CHARACTERS_CHANGED_EVENT } from "@/lib/tabletop/characterLibrary";

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

/**
 * Structure one parsed AI hero into a complete PlayerCharacter payload and
 * mint a `cf_char_…` id so it matches the Universal CF Card identity scheme.
 */
export function structureAiHero(
  player: Omit<PlayerCharacter, "tokenId"> & { tokenId?: string | null },
  sourceMarkdown = "",
  index = 0,
): PlayerCharacter {
  const stableId =
    typeof player.id === "string" && player.id.startsWith("cf_char_")
      ? player.id
      : `cf_char_${Date.now()}_${index}`;

  const base: PlayerCharacter = {
    ...player,
    id: stableId,
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

/** Project a structured hero sheet into a Universal CreationFile card (pre-persist). */
export function generatedHeroToCreationFile(
  player: PlayerCharacter,
  options?: { tags?: string[] },
): CreationFile {
  const classLabel = player.className.trim() || "Adventurer";
  const species = player.species.trim() || "Human";
  const now = Date.now();
  return {
    id: player.id,
    type: "character",
    ciClass: "character.sheet",
    title: player.name,
    subtitle: `${classLabel} Level ${player.level || 1} · ${species}`,
    tags: Array.from(
      new Set(
        [
          "Hero",
          classLabel || "Hero",
          "Generated",
          ...(options?.tags ?? []),
        ].filter(Boolean),
      ),
    ),
    data: player as unknown as Record<string, unknown>,
    createdAt: now,
    updatedAt: now,
  };
}

export type InstantiateAiHeroesResult = {
  ok: true;
  characters: SavedCharacter[];
  /** Universal CF cards corresponding to the saved heroes. */
  cards: CreationFile[];
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
  /** Universal CF card projection for Vault / sheet rendering. */
  card: CreationFile;
  /** Sheet payload aligned with CharacterSheetLayout. */
  player: PlayerCharacter;
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
      const structured = structureAiHero(p, markdown, index);
      const card = generatedHeroToCreationFile(structured);
      return {
        index,
        id: structured.id,
        name: structured.name,
        summary: card.subtitle ?? "",
        card,
        player: structured,
      };
    }),
  };
}

function notifyVaultRefresh(): void {
  if (typeof window === "undefined") return;
  // CHARACTERS_CHANGED is already fired by characterLibrary.persist; re-dispatch
  // ensures late Vault listeners catch bulk saves in the same tick.
  window.dispatchEvent(new Event(CHARACTERS_CHANGED_EVENT));
}

/**
 * Parse AI markdown, wrap each hero as a CreationFile, persist via characterLibrary,
 * refresh the Lore Vault, and optionally link to the active campaign.
 */
export async function instantiateAiHeroesFromMarkdown(
  markdown: string,
  opts?: {
    saveRoster?: boolean;
    source?: "workshop" | "created";
    /** When set, only these parsed indices are instantiated. */
    selectedIndices?: number[];
    /** Attach saved heroes to the active campaign (default true). */
    linkActiveCampaign?: boolean;
  },
): Promise<InstantiateAiHeroesResult | { ok: false; error: string }> {
  const preview = previewAiHeroesFromMarkdown(markdown);
  if (preview.heroes.length === 0) {
    return {
      ok: false,
      error:
        "Could not find any heroes. Each hero needs a ### heading under ## Characters.",
    };
  }

  const selected =
    opts?.selectedIndices && opts.selectedIndices.length > 0
      ? preview.heroes.filter((h) => opts.selectedIndices!.includes(h.index))
      : preview.heroes;

  if (selected.length === 0) {
    return {
      ok: false,
      error: "Select at least one hero to save into The Library.",
    };
  }

  const linkCampaign = opts?.linkActiveCampaign !== false;
  const savedCharacters: SavedCharacter[] = [];
  const cards: CreationFile[] = [];
  let list: SavedCharacter[] = [];

  for (const hero of selected) {
    const result = await saveHeroToLibrary({
      player: hero.player,
      source: opts?.source === "created" ? "created" : "import",
      linkActiveCampaign: linkCampaign,
      quiet: true,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    savedCharacters.push(result.character);
    const card = characterToCreationFile(result.character, {
      subtitle: result.card.subtitle,
    });
    cards.push({
      ...card,
      tags: Array.from(new Set(["Hero", "Generated", ...card.tags])),
    });
    list = result.characters;
  }

  let rosterId: string | null = null;
  if (opts?.saveRoster !== false) {
    const rosters = await saveCharacterRoster({
      name: preview.rosterName,
      markdown,
      source: "workshop",
      players: savedCharacters.map((c) => c.player),
    });
    rosterId = rosters[0]?.id ?? null;
    if (rosterId && linkCampaign) {
      void autoLinkToActiveCampaign({ partyId: rosterId });
    }
  }

  scheduleLibrarySnapshot();
  notifyVaultRefresh();

  const count = savedCharacters.length;
  const toast =
    count === 1 ? "1 Hero saved to Library" : `${count} Heroes saved to Library`;
  emitAppToast(
    rosterId ? `${toast} · fellowship “${preview.rosterName}”` : toast,
    "success",
  );

  return {
    ok: true,
    characters: list,
    cards,
    rosterName: preview.rosterName,
    rosterId,
    message: toast,
  };
}
