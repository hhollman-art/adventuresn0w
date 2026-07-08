export type IndexRow = {
  key: string;
  title: string;
  start: number;
  end: number;
  level: number;
  chapter: string;
};

export type SourceMetadata = {
  _source_file: string;
  chapter: string;
  start: number;
  end: number;
  pagePrefix: string;
  level: number;
};

export type MacroSectionNode = SourceMetadata & {
  key: string;
  title: string;
  markdown: string;
  children: MacroSectionNode[];
};

export type CreateACharacterMacro = {
  macroId: "create_a_character";
  title: string;
  description: string;
  outputFile: string;
  pagePrefix: string;
  markdown: string;
  /** Chronological nested steps — no isolated micro-files. */
  steps: MacroSectionNode[];
  sourceSpan: { start: number; end: number };
  sectionCount: number;
  parsedAt: string;
};

export type PlayerClassMacro = {
  macroId: "player_class";
  classKey: string;
  name: string;
  outputFile: string;
  pagePrefix: string;
  markdown: string;
  /** Core definition, progression table, proficiencies, saving throws — full class slice. */
  sections: MacroSectionNode[];
  /** All subclass branches bundled under this class file. */
  subclasses: MacroSectionNode[];
  /** Multiclassing prerequisites / "Becoming a …" guidance. */
  multiclassing: MacroSectionNode[];
  sourceSpan: { start: number; end: number };
  sectionCount: number;
  parsedAt: string;
};

export type GameplayMechanicsMacro = {
  macroId: "gameplay_mechanics";
  title: string;
  description: string;
  outputFile: string;
  pagePrefix: string;
  markdown: string;
  /** Playing the Game — combat, damage, resting, etc. */
  coreMechanics: MacroSectionNode[];
  /** Rules Glossary [Action] entries: Attack, Dash, Hide, Magic, … */
  combatActions: MacroSectionNode[];
  /** Full glossary lookup (Advantage, Surprise, conditions, …). */
  glossary: MacroSectionNode[];
  /** Flat slug → entry map for conditions, combat actions, and glossary terms. */
  lookup: Record<string, MacroLookupEntry>;
  sourceSpan: { start: number; end: number };
  entryCount: number;
  parsedAt: string;
};

export type MacroLookupEntry = {
  key: string;
  title: string;
  markdown: string;
  kind: "combat_action" | "condition" | "glossary";
  _source_file: string;
  chapter: string;
  start: number;
  end: number;
  pagePrefix: string;
};

export type MacroManifest = {
  edition: string;
  documentPdfId: string;
  parsedAt: string;
  source: "bundled-corpus" | "pdf-stream" | "hybrid";
  outputs: {
    create_a_character: string;
    gameplay_mechanics: string;
    classes: string[];
  };
  counts: {
    creationSteps: number;
    classFiles: number;
    gameplayEntries: number;
  };
};
