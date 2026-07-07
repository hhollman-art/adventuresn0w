import type { SrdApiResource } from "@/lib/srd/dnd5eApi";
import type { CiClass } from "@/lib/ciRegistry";

/**
 * Reference to one SRD equipment or magic item from the bundled catalogue.
 * These are read-only Creation Files (CFs) (`item.srd-equipment` / `item.srd-magic`) — not
 * copied into user storage; the ref is enough to fetch rules text and reuse
 * the item across characters, the Library SRD browser, and future features.
 */

export type SrdItemResource = "equipment" | "magic-items";

export type SrdItemRef = {
  resource: SrdItemResource;
  index: string;
  name: string;
};

export function isSrdItemResource(resource: SrdApiResource): resource is SrdItemResource {
  return resource === "equipment" || resource === "magic-items";
}

export function ciClassForSrdItem(resource: SrdItemResource): CiClass {
  return resource === "magic-items" ? "item.srd-magic" : "item.srd-equipment";
}

export function srdItemRefFromApi(
  resource: SrdItemResource,
  index: string,
  name: string,
): SrdItemRef {
  return { resource, index, name: name.trim() || index };
}

export function parseSrdItemRefKey(key: string): SrdItemRef | null {
  const m = /^(equipment|magic-items):(.+)$/.exec(key.trim());
  if (!m) return null;
  return {
    resource: m[1] as SrdItemResource,
    index: m[2],
    name: m[2],
  };
}

/** Parse an SRD gear note (`srd-ref:equipment:longsword`) written by character sheets. */
export function parseSrdItemRefFromNotes(
  notes: string,
  displayName?: string,
): SrdItemRef | null {
  const m = /^srd-ref:(equipment|magic-items):(.+)$/.exec(notes.trim());
  if (!m) return null;
  const ref = parseSrdItemRefKey(`${m[1]}:${m[2]}`);
  if (!ref) return null;
  if (displayName?.trim()) {
    return { ...ref, name: displayName.trim() };
  }
  return ref;
}

/** Label shown in gear lists when an item came from the SRD catalogue. */
export function formatSrdItemRef(ref: SrdItemRef): string {
  return ref.name;
}
