import { memoBySrdTable, srdSpellIndex } from "@/lib/srd/srdAssets";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import type { SrdSpellIndexEntry } from "@/lib/srd/types";

/** Longest names first so multi-word spells win over their substrings; rebuilt once per asset load. */
const spellsByNameLength = memoBySrdTable(srdSpellIndex, (spells) =>
  [...spells].sort((a, b) => b.name.length - a.name.length),
);

const SPELL_CONTEXT =
  /\b(cantrip|cantrips|spell|spells|innate|at will|\/day|prepared|spellcasting|ritual)\b/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSpellContextElement(el: HTMLElement): boolean {
  const text = el.textContent ?? "";
  if (SPELL_CONTEXT.test(text)) return true;

  const prev = el.previousElementSibling;
  if (prev instanceof HTMLElement) {
    const prevText = prev.textContent ?? "";
    if (SPELL_CONTEXT.test(prevText)) return true;
    if (/^h[2-6]$/i.test(prev.tagName) && /spell|cantrip/i.test(prevText)) return true;
  }

  const parent = el.parentElement;
  if (parent instanceof HTMLElement && parent !== el) {
    const parentText = parent.textContent ?? "";
    if (parent.tagName === "LI" && SPELL_CONTEXT.test(parentText.slice(0, 120))) {
      return true;
    }
  }

  return false;
}

type SpellMatch = { start: number; end: number; spell: SrdSpellIndexEntry };

function findSpellMatches(text: string): SpellMatch[] {
  const matches: SpellMatch[] = [];
  for (const spell of spellsByNameLength()) {
    const regex = new RegExp(`\\b${escapeRegExp(spell.name)}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        spell,
      });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: SpellMatch[] = [];
  for (const candidate of matches) {
    const overlaps = merged.some(
      (existing) => candidate.start < existing.end && candidate.end > existing.start,
    );
    if (!overlaps) merged.push(candidate);
  }
  return merged;
}

function createLaunchButton(
  spell: SrdSpellIndexEntry,
  onOpen: (spell: { id: string; name: string }) => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "spell-scry-launch";
  button.setAttribute("aria-label", `Open ${spell.name} in Scrying Glass`);
  button.title = `Open ${spell.name} in Scrying Glass`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen({ id: spell.id, name: spell.name });
  });
  return button;
}

/** Trait lead-ins ("Legendary Resistance.") name abilities, not spells — never chip them. */
const SKIP_TEXT_WITHIN = ".spell-scry-chip, .md-trait-name, button";

/** Splits text nodes in place so sibling markup (<strong>, <em>, <br>) survives enrichment. */
function enrichTextNodes(
  el: HTMLElement,
  onOpen: (spell: { id: string; name: string }) => void,
): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest(SKIP_TEXT_WITHIN)) continue;
    textNodes.push(node as Text);
  }

  for (const node of textNodes) {
    const text = node.data;
    const matches = findSpellMatches(text);
    if (matches.length === 0) continue;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const match of matches) {
      if (match.start > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, match.start)));
      }
      const chip = document.createElement("span");
      chip.className = "spell-scry-chip";
      chip.appendChild(document.createTextNode(text.slice(match.start, match.end)));
      chip.appendChild(createLaunchButton(match.spell, onOpen));
      fragment.appendChild(chip);
      cursor = match.end;
    }
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.replaceWith(fragment);
  }
}

/** Inject Scrying Glass quick-launch controls beside SRD spell names in rendered markdown. */
export function mountSpellLaunchersInElement(
  root: HTMLElement,
  onOpen: (spell: { id: string; name: string }) => void,
): void {
  const candidates = root.querySelectorAll("p, li, td, em, strong");
  candidates.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.querySelector(".spell-scry-chip")) return;
    if (!isSpellContextElement(node)) return;
    enrichTextNodes(node, onOpen);
  });
}

/** Resolve a spell label from freeform text (used by pickers and inline chips). */
export function resolveSpellFromLabel(label: string): SrdSpellIndexEntry | undefined {
  return findSpellIndexEntry(label.trim());
}

/** Parse comma-separated spell lists from stat block lines. */
export function parseSpellLabelsFromLine(line: string): string[] {
  const trimmed = line.trim();
  const colon = trimmed.indexOf(":");
  const header = colon >= 0 ? trimmed.slice(0, colon) : trimmed;
  if (!SPELL_CONTEXT.test(header)) return [];

  const body = (colon >= 0 ? trimmed.slice(colon + 1) : trimmed).trim();
  return body
    .split(/[,;]/)
    .map((part) => part.replace(/\([^)]*\)/g, "").trim())
    .filter((part) => part.length > 1);
}
