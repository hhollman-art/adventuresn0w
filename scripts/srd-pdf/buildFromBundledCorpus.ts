import type { CharacterCreationStep, ParsedSpell, SrdDatabase, SystemRuleEntry } from "./types.js";
import { prefixedSlug } from "./slug.js";

type SpellIndexRow = {
  key: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialDescription: string | null;
  };
  duration: string;
  classes: string[];
  description: string;
  higherLevel: string | null;
  start?: number;
  end?: number;
  _source_file?: string;
  sourceFile?: string;
};

type IndexRow = {
  key: string;
  title: string;
  start: number;
  end: number;
  chapter: string;
};

const CREATION_KEYS = new Set([
  "choose-a-character-sheet",
  "create-your-character",
  "step-1-choose-class",
  "write-your-level",
  "note-armor-training",
  "step-2-character-origin",
  "choose-a-background",
  "choose-starting-equipment",
  "choose-a-species",
  "step-3-ability-scores",
  "generate-your-scores",
  "assign-ability-scores",
  "adjust-ability-scores",
  "determine-ability-modifiers",
  "step-4-alignment",
  "the-nine-alignments",
  "step-5-character-creation-details",
  "record-class-features",
  "fill-in-numbers",
  "level-advancement",
  "starting-at-higher-levels",
  "multiclassing",
  "trinkets",
]);

export async function buildFromBundledCorpus(): Promise<
  Pick<SrdDatabase, "create_a_character" | "spells" | "system_rules">
> {
  const [{ SRD_DOCUMENT_BODY }, { SRD_DOCUMENT_INDEX }, { SRD_SPELL_INDEX }] = await Promise.all([
    import("../../src/lib/srd/srdDocument.data.ts"),
    import("../../src/lib/srd/srdDocumentIndex.data.ts"),
    import("../../src/lib/srd/spellIndex.data.ts"),
  ]);

  const body = SRD_DOCUMENT_BODY;
  const index = SRD_DOCUMENT_INDEX as IndexRow[];
  const spellIndex = SRD_SPELL_INDEX as SpellIndexRow[];

  const steps: CharacterCreationStep[] = index
    .filter((row) => row.chapter === "character-creation" && CREATION_KEYS.has(row.key))
    .sort((a, b) => a.start - b.start)
    .map((row, order) => ({
      order,
      key: row.key,
      slug: row.key,
      title: row.title,
      markdown: body.slice(row.start, row.end).trim(),
      _category: "character_creation" as const,
      _source_file: `srdDocumentIndex:character-creation/${row.key}`,
      sourcePages: [],
    }));

  const spells: ParsedSpell[] = spellIndex.map((spell) => {
    const components = [
      spell.components.verbal ? "V" : "",
      spell.components.somatic ? "S" : "",
      spell.components.material ? "M" : "",
    ]
      .filter(Boolean)
      .join(", ");
    const markdown =
      spell.start != null && spell.end != null
        ? body.slice(spell.start, spell.end).trim()
        : [
            `# ${spell.name}`,
            "",
            `*${spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} ${spell.school}*`,
            "",
            `**Casting Time:** ${spell.castingTime}`,
            `**Range:** ${spell.range}`,
            `**Components:** ${components}`,
            `**Duration:** ${spell.duration}`,
            "",
            spell.description,
            spell.higherLevel ? `\n\n${spell.higherLevel}` : "",
          ].join("\n");

    return {
      key: spell.key,
      name: spell.name,
      level: spell.level,
      levelLabel: spell.level === 0 ? `Cantrip ${spell.school}` : `Level ${spell.level} ${spell.school}`,
      school: spell.school,
      castingTime: spell.castingTime,
      range: spell.range,
      components,
      duration: spell.duration,
      classes: [...spell.classes],
      description: spell.description,
      higherLevel: spell.higherLevel,
      markdown,
      _source_file: spell.sourceFile ?? spell._source_file ?? `srdDocumentIndex:spells/${spell.key}`,
      sourcePages: [],
    };
  });

  const systemKeys = index.filter(
    (row) =>
      row.chapter === "playing-the-game" ||
      row.chapter === "rules-glossary" ||
      row.chapter === "gameplay-toolbox",
  );

  const system_rules: SystemRuleEntry[] = systemKeys
    .filter((row) => {
      if (row.chapter === "character-creation") return false;
      if (CREATION_KEYS.has(row.key)) return false;
      return body.slice(row.start, row.end).trim().length > 40;
    })
    .map((row) => {
      const prefix =
        /combat|attack|damage|cover|death|condition/i.test(row.title) ? "combat" : "rules";
      return {
        key: prefixedSlug(prefix, row.title),
        slug: prefixedSlug(prefix, row.title),
        title: row.title,
        markdown: body.slice(row.start, row.end).trim(),
        _category: "system_rules" as const,
        _source_file: `srdDocumentIndex:${row.chapter}/${row.key}`,
        sourcePages: [],
      };
    });

  return {
    create_a_character: {
      title: "Character Creation",
      description: "Sequential character creation steps from bundled SRD markdown (high-fidelity source).",
      steps,
    },
    spells,
    system_rules,
  };
}

export async function mergePdfWithBundled(
  pdfPartial: Pick<SrdDatabase, "create_a_character" | "spells" | "system_rules">,
): Promise<Pick<SrdDatabase, "create_a_character" | "spells" | "system_rules">> {
  const bundled = await buildFromBundledCorpus();
  return {
    create_a_character: {
      ...bundled.create_a_character,
      steps:
        pdfPartial.create_a_character.steps.length >= 8
          ? pdfPartial.create_a_character.steps
          : bundled.create_a_character.steps,
    },
    spells: pdfPartial.spells.length >= 100 ? pdfPartial.spells : bundled.spells,
    system_rules:
      pdfPartial.system_rules.length >= 20 ? pdfPartial.system_rules : bundled.system_rules,
  };
}
