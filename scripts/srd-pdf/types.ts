/** Output contract for scripts/parseSrdPdf.ts → data/srd/srd_database.json */

export type SrdPdfParseMeta = {
  sourcePdf: string;
  edition: "5.2.1";
  documentPdfId: "SRD_CC_v5.2.1";
  parsedAt: string;
  pageCount: number;
  charCount: number;
  engine: "pdfjs" | "pdf-parse";
  dryRun: boolean;
};

export type CharacterCreationStep = {
  order: number;
  key: string;
  slug: string;
  title: string;
  markdown: string;
  _category: "character_creation";
  _source_file: string;
  sourcePages: number[];
};

export type ParsedSpell = {
  key: string;
  name: string;
  level: number;
  levelLabel: string;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  classes: string[];
  description: string;
  higherLevel: string | null;
  markdown: string;
  _source_file: string;
  sourcePages: number[];
};

export type SystemRuleEntry = {
  key: string;
  slug: string;
  title: string;
  markdown: string;
  _category: "system_rules";
  _source_file: string;
  sourcePages: number[];
};

export type SrdDatabase = {
  meta: SrdPdfParseMeta;
  create_a_character: {
    title: "Character Creation";
    description: string;
    steps: CharacterCreationStep[];
  };
  spells: ParsedSpell[];
  system_rules: SystemRuleEntry[];
};

export type PdfPageText = {
  pageNumber: number;
  text: string;
  charCount: number;
};

export type SectionSlice = {
  key: string;
  title: string;
  markdown: string;
  startPage: number;
  endPage: number;
  sourcePages: number[];
};
