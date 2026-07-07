import { SRD_SPELL_INDEX } from "@/lib/srd/spellIndex.data";
import type { SrdSpellIndexEntry } from "@/lib/srd/types";

export { SRD_SPELL_INDEX };

export function findSpellIndexEntry(idOrKey: string): SrdSpellIndexEntry | undefined {
  const q = idOrKey.trim().toLowerCase();
  return SRD_SPELL_INDEX.find(
    (spell) =>
      spell.id.toLowerCase() === q ||
      spell.key === q ||
      spell.documentKey === q ||
      spell.name.toLowerCase() === q,
  );
}

export function searchSpellIndex(
  query: string,
  opts?: { level?: number; school?: string; classKey?: string; limit?: number },
): SrdSpellIndexEntry[] {
  const q = query.trim().toLowerCase();
  const limit = opts?.limit ?? 40;
  let pool = SRD_SPELL_INDEX;
  if (opts?.level !== undefined) pool = pool.filter((s) => s.level === opts.level);
  if (opts?.school) pool = pool.filter((s) => s.school.toLowerCase() === opts.school!.toLowerCase());
  if (opts?.classKey) {
    const ck = opts.classKey.toLowerCase();
    pool = pool.filter((s) => s.classes.includes(ck));
  }
  if (!q) return pool.slice(0, limit);
  return pool
    .filter(
      (spell) =>
        spell.name.toLowerCase().includes(q) ||
        spell.key.includes(q) ||
        spell.school.toLowerCase().includes(q),
    )
    .slice(0, limit);
}
