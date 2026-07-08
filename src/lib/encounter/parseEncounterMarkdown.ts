import type { EncounterCombatant } from "@/lib/encounter/types";

const COUNT_PREFIX = /^(\d+)\s*(?:x\s+)?(.+)$/i;
const HP_SUFFIX = /\(\s*(\d+)\s*hp\s*\)/i;

/** Pull simple combatant rows from adventure scene markdown (**Encounter:** lines). */
export function parseEncounterCombatantsFromMarkdown(markdown: string): EncounterCombatant[] {
  const combatants: EncounterCombatant[] = [];
  const seen = new Set<string>();

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const encounterLine =
      /\*\*Encounter:\*\*\s*(.+)/i.exec(line) ??
      /\*\*Combat:\*\*\s*(.+)/i.exec(line) ??
      /^Encounter:\s*(.+)/i.exec(line);
    if (!encounterLine) continue;

    for (const chunk of encounterLine[1].split(/[,;]/)) {
      const parsed = parseCombatantChunk(chunk.trim());
      if (!parsed) continue;
      const key = `${parsed.label}:${parsed.count ?? 1}`;
      if (seen.has(key)) continue;
      seen.add(key);
      combatants.push(parsed);
    }
  }

  return combatants;
}

function parseCombatantChunk(chunk: string): EncounterCombatant | null {
  if (!chunk) return null;

  let label = chunk;
  let count = 1;
  let maxHp: number | undefined;

  const countMatch = COUNT_PREFIX.exec(chunk);
  if (countMatch) {
    count = Math.max(1, Number(countMatch[1]));
    label = countMatch[2].trim();
  }

  const hpMatch = HP_SUFFIX.exec(label);
  if (hpMatch) {
    maxHp = Number(hpMatch[1]);
    label = label.replace(HP_SUFFIX, "").trim();
  }

  label = label.replace(/\*\*/g, "").replace(/\([^)]*\)/g, "").trim();
  if (!label) return null;

  return {
    label,
    kind: "monster",
    count,
    maxHp: Number.isFinite(maxHp) && maxHp! > 0 ? maxHp : undefined,
  };
}
