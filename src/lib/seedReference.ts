import { ddeasySeedOptionLabel, type SavedRealmSeed } from "@/lib/realmSeeds";
import { MAX_REALM_SEED_CHARS } from "@/lib/requestLimits";

export type LabeledSeedPart = {
  label: string;
  markdown: string;
};

function clampMarkdown(body: string, maxChars: number): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;
}

/** Merge one or more labeled seed bodies for prompt/API attachment. */
export function combineLabeledSeedMarkdown(
  parts: readonly LabeledSeedPart[],
  maxChars = MAX_REALM_SEED_CHARS,
): string | undefined {
  const usable = parts
    .map((part) => ({
      label: part.label.trim(),
      markdown: part.markdown.trim(),
    }))
    .filter((part) => part.markdown.length > 0);
  if (usable.length === 0) return undefined;
  if (usable.length === 1) {
    const single = clampMarkdown(usable[0]!.markdown, maxChars);
    return single || undefined;
  }

  const header =
    `## Attached sources (${usable.length} documents)\n` +
    "The user attached multiple saved documents from their library. Treat **all** as reference context. " +
    "If details conflict, follow the user's brief below or note the tension briefly when it helps the DM.\n\n";

  let out = header;
  for (let i = 0; i < usable.length; i++) {
    const part = usable[i]!;
    const block = `---\n\n### Source ${i + 1}: ${part.label || "Saved Creation File (CF)"}\n\n${part.markdown}\n\n`;
    if (out.length + block.length > maxChars) {
      const remaining = maxChars - out.length - 24;
      if (remaining > 120) {
        out += block.slice(0, remaining) + "\n\n… (truncated)\n";
      }
      break;
    }
    out += block;
  }

  const combined = out.trim();
  return combined || undefined;
}

export function combineSavedSeedMarkdown(
  seeds: readonly SavedRealmSeed[],
  ids: readonly string[],
  maxChars = MAX_REALM_SEED_CHARS,
): string | undefined {
  const parts: LabeledSeedPart[] = [];
  for (const id of ids) {
    const seed = seeds.find((s) => s.id === id);
    if (!seed?.markdown.trim()) continue;
    parts.push({
      label: ddeasySeedOptionLabel(seed),
      markdown: seed.markdown,
    });
  }
  return combineLabeledSeedMarkdown(parts, maxChars);
}

export function pruneSeedIds(
  ids: readonly string[],
  seeds: readonly SavedRealmSeed[],
): string[] {
  const valid = new Set(seeds.map((s) => s.id));
  const next = ids.filter((id) => valid.has(id));
  return next.length === ids.length ? [...ids] : next;
}
