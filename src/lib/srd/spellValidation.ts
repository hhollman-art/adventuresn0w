import { findSrdEntityByName, getSrdEntity, parseSrdEntityId } from "@/lib/srd/corpus";
import { SRD_CATALOGUE } from "@/lib/srd";
import type { SrdEntityId } from "@/lib/srd/types";

export type SpellValidationResult = {
  valid: boolean;
  normalizedId: string | null;
  name: string | null;
  entityId: SrdEntityId | null;
  message?: string;
};

function spellFromCatalogue(ref: string) {
  const trimmed = ref.trim();
  const lower = trimmed.toLowerCase();
  return SRD_CATALOGUE.spells.find(
    (spell) => spell.id === trimmed || spell.name.toLowerCase() === lower,
  );
}

/** Validate a spell id or name against the bundled SRD spell index and corpus. */
export function validateSpellReference(ref: string): SpellValidationResult {
  const trimmed = ref.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedId: null,
      name: null,
      entityId: null,
      message: "Empty spell reference",
    };
  }

  const asEntityId = parseSrdEntityId(
    trimmed.startsWith("spell:") ? trimmed : `spell:${trimmed}`,
  );
  if (asEntityId) {
    const entity = getSrdEntity(asEntityId);
    if (entity?.kind === "spell") {
      return {
        valid: true,
        normalizedId: entity.key,
        name: entity.name,
        entityId: entity.id,
      };
    }
  }

  const byName = findSrdEntityByName("spell", trimmed);
  if (byName) {
    return {
      valid: true,
      normalizedId: byName.key,
      name: byName.name,
      entityId: byName.id,
    };
  }

  const catalogSpell = spellFromCatalogue(trimmed);
  if (catalogSpell) {
    return {
      valid: true,
      normalizedId: catalogSpell.id,
      name: catalogSpell.name,
      entityId: `spell:${catalogSpell.id}`,
    };
  }

  return {
    valid: false,
    normalizedId: null,
    name: null,
    entityId: null,
    message: `"${trimmed}" is not in the bundled SRD spell list`,
  };
}

export function validateKnownSpellIds(ids: readonly string[]): SpellValidationResult[] {
  return ids.map((id) => validateSpellReference(id));
}

export function allSpellsValid(ids: readonly string[]): boolean {
  return validateKnownSpellIds(ids).every((row) => row.valid);
}
