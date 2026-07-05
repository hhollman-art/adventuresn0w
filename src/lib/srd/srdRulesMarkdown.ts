import { formatSpellLevel } from "@/lib/srd/spells";
import { SRD_ATTRIBUTION_MARKDOWN, SRD_MANIFEST } from "@/lib/srd/manifest";
import type { SrdCatalogue, SrdSpellEntry } from "@/lib/srd/types";
import { SRD_CATALOGUE } from "@/lib/srd";

function titleCaseClassKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function spellLevelSectionTitle(level: number): string {
  if (level <= 0) return "Spells — cantrips";
  return `Spells — ${formatSpellLevel(level)} level`;
}

function buildSpellSections(spells: readonly SrdSpellEntry[]): string[] {
  const byLevel = new Map<number, SrdSpellEntry[]>();
  for (const spell of spells) {
    const bucket = byLevel.get(spell.level) ?? [];
    bucket.push(spell);
    byLevel.set(spell.level, bucket);
  }

  const sections: string[] = [];
  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    const group = [...(byLevel.get(level) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    sections.push(`## ${spellLevelSectionTitle(level)}`, "");
    for (const spell of group) {
      const cls = spell.classes.map(titleCaseClassKey).join(", ");
      sections.push(`- **${spell.name}** — ${spell.school} (${cls})`);
    }
    sections.push("");
  }
  return sections;
}

/** Markdown booklet for read-only SRD browse (preview carousel with Contents + ## sections). */
export function buildSrdRulesMarkdown(
  catalogue: SrdCatalogue = SRD_CATALOGUE,
): string {
  const lines: string[] = [
    `# SRD ${catalogue.version} Rules`,
    "",
    "Read-only reference bundled with D&D Easy. Use **Contents** in the preview panel, then page through each section. Generators and pickers use this catalogue; material from books you own stays in your private notes and imports.",
    "",
    `- **${catalogue.classes.length}** classes (each with one included SRD subclass)`,
    `- **${catalogue.spells.length}** spells`,
    `- **${catalogue.ancestries.length}** ancestries`,
    `- Licensed under **${SRD_MANIFEST.license}** — see the final section for attribution`,
    "",
    "## Classes",
    "",
    "| Class | Included SRD subclass |",
    "| --- | --- |",
  ];

  for (const cls of catalogue.classes) {
    lines.push(`| ${cls.name} | ${cls.srdSubclass ?? "—"} |`);
  }
  lines.push("");

  lines.push(...buildSpellSections(catalogue.spells));

  lines.push("## Ancestries", "");
  for (const ancestry of catalogue.ancestries) {
    lines.push(`- ${ancestry.name}`);
  }
  lines.push("");

  lines.push("## License & attribution", "", SRD_ATTRIBUTION_MARKDOWN, "");

  return lines.join("\n").trimEnd();
}
