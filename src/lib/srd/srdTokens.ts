import { getSrdEntity, parseSrdEntityId } from "@/lib/srd/corpus";
import type { SrdEntityId } from "@/lib/srd/types";

/** Inline reference token, e.g. `[[srd:spell:fireball]]`. */
export const SRD_TOKEN_PATTERN = /\[\[srd:([a-z-]+):([^\]]+)\]\]/g;

export function formatSrdToken(entityId: SrdEntityId): string {
  return `[[srd:${entityId}]]`;
}

export function parseSrdToken(raw: string): SrdEntityId | null {
  const m = /^\[\[srd:([a-z-]+):([^\]]+)\]\]$/.exec(raw.trim());
  if (!m) return null;
  return parseSrdEntityId(`${m[1]}:${m[2]}`);
}

export function findSrdTokensInText(text: string): SrdEntityId[] {
  const ids: SrdEntityId[] = [];
  for (const match of text.matchAll(SRD_TOKEN_PATTERN)) {
    const id = parseSrdEntityId(`${match[1]}:${match[2]}`);
    if (id) ids.push(id);
  }
  return ids;
}

/** Replace tokens with readable names for display/export (keeps token in title). */
export function expandSrdTokensForDisplay(text: string): string {
  return text.replace(SRD_TOKEN_PATTERN, (_match, kind, key) => {
    const entityId = `${kind}:${key}` as SrdEntityId;
    const entity = getSrdEntity(entityId);
    return entity ? `[${entity.name}](srd:${entityId})` : `[${key}](srd:${entityId})`;
  });
}

export function insertTextAtCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  insert: string,
  onChange: (next: string) => void,
): void {
  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;
  const next = currentValue.slice(0, start) + insert + currentValue.slice(end);
  onChange(next);
  const pos = start + insert.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  });
}
