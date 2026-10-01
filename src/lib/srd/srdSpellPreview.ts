import { lookupSrdDocumentMarkdown } from "@/lib/srd/srdDocumentLookup";
import { SRD_ATTRIBUTION_SHORT } from "@/lib/srd/manifest";
import { srdDocument } from "@/lib/srd/srdAssets";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import type { SrdSpellIndexEntry } from "@/lib/srd/types";

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  const mod10 = n % 10;
  if (mod10 === 1) return "st";
  if (mod10 === 2) return "nd";
  if (mod10 === 3) return "rd";
  return "th";
}

function formatSpellLevel(level: number): string {
  return level === 0 ? "Cantrip" : `${level}${ordinal(level)}-level`;
}

function formatComponents(spell: SrdSpellIndexEntry): string {
  const parts: string[] = [];
  if (spell.components.verbal) parts.push("V");
  if (spell.components.somatic) parts.push("S");
  if (spell.components.material) {
    parts.push(
      spell.components.materialDescription
        ? `M (${spell.components.materialDescription})`
        : "M",
    );
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

function formatClassList(classes: readonly string[]): string {
  if (!classes.length) return "—";
  return classes.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ");
}

/** One-line library detail for a spell index row. */
export function formatSrdSpellLibraryDetail(spell: SrdSpellIndexEntry): string {
  const parts = [
    `${formatSpellLevel(spell.level)} ${spell.school}`,
    spell.castingTime,
    spell.range,
    formatComponents(spell),
    spell.duration,
  ].filter(Boolean);
  if (spell.classes.length) parts.push(formatClassList(spell.classes));
  return parts.join(" · ");
}

function stripDocumentHeading(markdown: string): string {
  return markdown.replace(/^#\s+[^\n]+\n+/, "").trim();
}

function splitHigherLevelSection(body: string): { description: string; higherLevel: string | null } {
  const re = /\n##\s+At Higher Levels?\s*\n/i;
  const match = re.exec(body);
  if (!match || match.index === undefined) {
    return { description: body.trim(), higherLevel: null };
  }
  return {
    description: body.slice(0, match.index).trim(),
    higherLevel: body.slice(match.index).replace(/^##\s+At Higher Levels?\s*\n/i, "").trim() || null,
  };
}

function stripLeadingSubtitle(body: string): string {
  return body.replace(/^_[^_]+_\s*\n+/m, "").trim();
}

/**
 * Full Scrying Glass markdown for one SRD spell — structured index fields plus
 * authoritative description text from SRD_CC_v5.2.1 when bundled.
 */
export function buildSrdSpellPreviewMarkdown(params: {
  key: string;
  name?: string;
}): string | null {
  const spell = findSpellIndexEntry(params.key);
  const documentMarkdown = lookupSrdDocumentMarkdown({
    resource: "spells",
    name: spell?.name ?? params.name ?? params.key,
    index: params.key,
  });

  if (!spell && !documentMarkdown?.trim()) return null;

  const name = spell?.name ?? params.name ?? params.key;
  const lines: string[] = [`# ${name}`, ""];

  if (spell) {
    lines.push(
      "| Field | Value |",
      "| --- | --- |",
      `| **Level** | ${formatSpellLevel(spell.level)} ${spell.school} |`,
      `| **Casting Time** | ${spell.castingTime || "—"} |`,
      `| **Range** | ${spell.range || "—"} |`,
      `| **Components** | ${formatComponents(spell)} |`,
      `| **Duration** | ${spell.duration || "—"} |`,
      `| **Classes** | ${formatClassList(spell.classes)} |`,
      "",
    );
  }

  let description = spell?.description?.trim() ?? "";
  let higherLevel = spell?.higherLevel?.trim() ?? null;

  if (documentMarkdown?.trim()) {
    const docBody = stripLeadingSubtitle(stripDocumentHeading(documentMarkdown));
    const split = splitHigherLevelSection(docBody);
    if (split.description) description = split.description;
    if (split.higherLevel) higherLevel = split.higherLevel;
  }

  if (description) {
    lines.push("## Description", "", description, "");
  }

  if (higherLevel) {
    lines.push("## At Higher Levels", "", higherLevel, "");
  }

  lines.push(
    "---",
    "",
    `${SRD_ATTRIBUTION_SHORT} Text from **${srdDocument().pdfId}** (SRD 5.2.1, CC BY 4.0).`,
  );

  return lines.join("\n").trim();
}
