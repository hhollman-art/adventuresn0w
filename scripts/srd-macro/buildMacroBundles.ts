import { nestIndexRows } from "./headerStack.js";
import {
  attachRowMetadata,
  countNodes,
  pagePrefixAtOffset,
  rowsInChapter,
  rowsWithinSpan,
  sliceMarkdown,
  type SrdCorpus,
} from "./corpus.js";
import {
  CHARACTER_CREATION_CHAPTER,
  isCombatActionTitle,
  isMulticlassSection,
  isSubclassSection,
  PLAYER_CLASS_KEYS,
  PLAYING_THE_GAME_RANGES,
} from "./taxonomy.js";
import { CONDITION_NAMES } from "./pdfAnchors.js";
import type {
  CreateACharacterMacro,
  GameplayMechanicsMacro,
  MacroLookupEntry,
  MacroSectionNode,
  PlayerClassMacro,
} from "./types.js";

function flattenNodes(nodes: MacroSectionNode[]): MacroSectionNode[] {
  const out: MacroSectionNode[] = [];
  const walk = (list: MacroSectionNode[]) => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function splitClassSections(classRows: MacroSectionNode[]): {
  sections: MacroSectionNode[];
  subclasses: MacroSectionNode[];
  multiclassing: MacroSectionNode[];
} {
  const sections: MacroSectionNode[] = [];
  const subclasses: MacroSectionNode[] = [];
  const multiclassing: MacroSectionNode[] = [];

  for (const node of classRows) {
    if (isMulticlassSection(node.key, node.title)) {
      multiclassing.push(node);
    } else if (isSubclassSection(node.key, node.title)) {
      subclasses.push(node);
    } else {
      sections.push(node);
    }
  }

  return { sections, subclasses, multiclassing };
}

function buildGameplayLookup(
  combatActions: MacroSectionNode[],
  glossary: MacroSectionNode[],
): Record<string, MacroLookupEntry> {
  const lookup: Record<string, MacroLookupEntry> = {};
  const conditionSet = new Set<string>(CONDITION_NAMES.map((c) => c.toLowerCase()));

  const add = (entry: MacroSectionNode, kind: MacroLookupEntry["kind"]) => {
    lookup[entry.key] = {
      key: entry.key,
      title: entry.title,
      markdown: entry.markdown,
      kind,
      _source_file: entry._source_file,
      chapter: entry.chapter,
      start: entry.start,
      end: entry.end,
      pagePrefix: entry.pagePrefix,
    };
  };

  for (const action of combatActions) {
    add(action, "combat_action");
  }

  for (const term of glossary) {
    const titleBase = term.title.replace(/\s*\[(Action|Condition)\]\s*$/i, "").trim().toLowerCase();
    const isCondition =
      /\[condition\]/i.test(term.title) || conditionSet.has(titleBase);
    const kind = isCondition ? "condition" : "glossary";
    add(term, kind);
  }

  return lookup;
}

export function buildCreateACharacterMacro(corpus: SrdCorpus): CreateACharacterMacro {
  const { body, index } = corpus;
  const chapterRows = rowsInChapter(index, CHARACTER_CREATION_CHAPTER);
  if (chapterRows.length === 0) {
    throw new Error("No character-creation index rows found.");
  }

  const spanStart = chapterRows[0].start;
  const spanEnd = chapterRows[chapterRows.length - 1].end;
  const steps = nestIndexRows(chapterRows, (row) => attachRowMetadata(body, row));

  return {
    macroId: "create_a_character",
    title: "Create a Character",
    description:
      "Unified chronological PC creation flow — class, origin, ability scores, alignment, details, advancement, multiclassing, and trinkets in one macro document.",
    outputFile: "create_a_character.json",
    pagePrefix: pagePrefixAtOffset(body, spanStart, CHARACTER_CREATION_CHAPTER),
    markdown: sliceMarkdown(body, spanStart, spanEnd),
    steps,
    sourceSpan: { start: spanStart, end: spanEnd },
    sectionCount: countNodes(steps),
    parsedAt: new Date().toISOString(),
  };
}

export function buildPlayerClassMacro(corpus: SrdCorpus, classKey: string): PlayerClassMacro | null {
  const { body, index } = corpus;
  const classRow = index.find((row) => row.chapter === "classes" && row.key === classKey && row.level === 3);
  if (!classRow) return null;

  const classRows = rowsWithinSpan(index, classRow.start, classRow.end);
  const nested = nestIndexRows(classRows, (row) => attachRowMetadata(body, row));
  const topLevel = nested.length === 1 ? nested[0].children : nested;
  const { sections, subclasses, multiclassing } = splitClassSections(topLevel);

  const title =
    classRow.title.charAt(0).toUpperCase() + classRow.title.slice(1);

  return {
    macroId: "player_class",
    classKey,
    name: title,
    outputFile: `classes/${classKey}.json`,
    pagePrefix: pagePrefixAtOffset(body, classRow.start, "classes"),
    markdown: sliceMarkdown(body, classRow.start, classRow.end),
    sections,
    subclasses,
    multiclassing,
    sourceSpan: { start: classRow.start, end: classRow.end },
    sectionCount: countNodes(topLevel),
    parsedAt: new Date().toISOString(),
  };
}

export function buildAllPlayerClassMacros(corpus: SrdCorpus): PlayerClassMacro[] {
  return PLAYER_CLASS_KEYS.map((key) => buildPlayerClassMacro(corpus, key)).filter(
    (macro): macro is PlayerClassMacro => macro != null,
  );
}

export function buildGameplayMechanicsMacro(corpus: SrdCorpus): GameplayMechanicsMacro {
  const { body, index } = corpus;

  const playingRows = rowsInChapter(index, "playing-the-game").filter(
    (row) =>
      row.start >= PLAYING_THE_GAME_RANGES.social_interaction.start &&
      row.end <= PLAYING_THE_GAME_RANGES.damage_and_healing.end,
  );

  const glossaryRows = rowsInChapter(index, "rules-glossary").filter(
    (row) => row.key !== "glossary-conventions",
  );

  const coreMechanics = nestIndexRows(playingRows, (row) => attachRowMetadata(body, row));
  const glossaryFlat = glossaryRows.map((row) => ({
    ...attachRowMetadata(body, row),
    children: [] as MacroSectionNode[],
  }));

  const combatActions = glossaryFlat.filter((row) => isCombatActionTitle(row.title));
  const glossary = glossaryFlat.filter((row) => !isCombatActionTitle(row.title));
  const lookup = buildGameplayLookup(combatActions, glossary);

  const spanStart = Math.min(
    playingRows[0]?.start ?? PLAYING_THE_GAME_RANGES.social_interaction.start,
    glossaryRows[0]?.start ?? Number.MAX_SAFE_INTEGER,
  );
  const spanEnd = Math.max(
    playingRows[playingRows.length - 1]?.end ?? 0,
    glossaryRows[glossaryRows.length - 1]?.end ?? 0,
  );

  const markdown = [
    sliceMarkdown(body, playingRows[0].start, playingRows[playingRows.length - 1].end),
    sliceMarkdown(body, glossaryRows[0].start, glossaryRows[glossaryRows.length - 1].end),
  ].join("\n\n");

  return {
    macroId: "gameplay_mechanics",
    title: "Gameplay Mechanics",
    description:
      "Unified system reference: core play loops, combat, damage and healing, combat actions, and rules glossary definitions.",
    outputFile: "gameplay_mechanics.json",
    pagePrefix: pagePrefixAtOffset(body, spanStart, "playing-the-game"),
    markdown,
    coreMechanics,
    combatActions,
    glossary,
    lookup,
    sourceSpan: { start: spanStart, end: spanEnd },
    entryCount: countNodes(coreMechanics) + combatActions.length + glossary.length,
    parsedAt: new Date().toISOString(),
  };
}

export function summarizeMacros(
  creation: CreateACharacterMacro,
  classes: PlayerClassMacro[],
  mechanics: GameplayMechanicsMacro,
): {
  creationStepCount: number;
  classFileCount: number;
  gameplayEntryCount: number;
  classSectionCounts: Record<string, number>;
} {
  return {
    creationStepCount: creation.sectionCount,
    classFileCount: classes.length,
    gameplayEntryCount: mechanics.entryCount,
    classSectionCounts: Object.fromEntries(classes.map((c) => [c.classKey, c.sectionCount])),
  };
}

/** Flatten nested steps for optional markdown export. */
export function flattenCreationSteps(steps: MacroSectionNode[]): MacroSectionNode[] {
  return flattenNodes(steps);
}
