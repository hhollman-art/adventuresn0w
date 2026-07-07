"use client";

import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { SavedCampaign } from "@/lib/campaigns";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import {
  formatEntryShelfLine,
  fantasyCiLabel,
} from "@/lib/workshop/libraryBrowseFilters";
import {
  sessionRecordToMarkdown,
  type LibraryListEntry,
} from "@/lib/workshop/libraryCatalog";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import { characterToMarkdownFile } from "@/lib/tabletop/characterMarkdown";
import { characterSummary } from "@/lib/tabletop/character";
import { GAME_ITEM_KIND_LABEL } from "@/lib/itemLibrary";
import type { SavedSessionRecord } from "@/lib/sessions/record";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import { ciClassVisual } from "@/lib/ui/ciClassVisuals";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

export type LibraryEntryDetailPaneProps = {
  selection: LibraryViewSelection;
  entry: LibraryListEntry | null;
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  characters: SavedCharacter[];
  items: SavedGameItem[];
  parties: SavedCharacterRoster[];
  campaigns: SavedCampaign[];
  npcs: SavedNpc[];
  locations: SavedLocation[];
  sessionRecords: SavedSessionRecord[];
};

function detailMarkdown(props: LibraryEntryDetailPaneProps): string {
  const { selection } = props;
  if (!selection) return "";

  if (selection.kind === "npc") {
    const npc = props.npcs.find((n) => n.id === selection.id);
    if (!npc) return "";
    const parts = [npc.markdown.trim() || `# ${npc.name}\n`];
    if (npc.motivation.trim()) parts.push(`\n## Motivation\n\n${npc.motivation.trim()}`);
    if (npc.secrets.trim()) parts.push(`\n## Secrets\n\n${npc.secrets.trim()}`);
    return parts.join("");
  }

  if (selection.kind === "location") {
    return props.locations.find((l) => l.id === selection.id)?.markdown ?? "";
  }

  if (selection.kind === "session") {
    const record = props.sessionRecords.find((r) => r.id === selection.id);
    return record ? sessionRecordToMarkdown(record) : "";
  }

  if (selection.kind === "seed") {
    return props.seeds.find((s) => s.id === selection.id)?.markdown ?? "";
  }
  if (selection.kind === "result") {
    return props.results.find((r) => r.id === selection.id)?.markdown ?? "";
  }
  if (selection.kind === "character") {
    const character = props.characters.find((c) => c.id === selection.id);
    return character ? characterToMarkdownFile(character.player) : "";
  }
  if (selection.kind === "item") {
    const item = props.items.find((i) => i.id === selection.id);
    if (!item) return "";
    return `# ${item.name}\n\n${item.description.trim() || `${GAME_ITEM_KIND_LABEL[item.kind]} · ${item.itemType}`.trim()}`;
  }
  if (selection.kind === "party") {
    return props.parties.find((p) => p.id === selection.id)?.markdown ?? "";
  }
  if (selection.kind === "campaign") {
    const campaign = props.campaigns.find((c) => c.id === selection.id);
    if (!campaign) return "";
    return `# ${campaign.name}\n\n${campaign.description.trim() || "Campaign container — links party, adventures, characters, and items by reference."}\n\n## Linked CFs\n\n- Party: ${campaign.partyId ? "linked" : "none"}\n- CFs: ${campaign.seedIds.length}\n- Results: ${campaign.resultIds.length}\n- Characters: ${campaign.characterIds.length}\n- Items: ${campaign.itemIds.length}\n- NPCs: ${campaign.npcIds.length}\n- Locations: ${campaign.locationIds.length}\n- Session logs: ${campaign.sessionRecordIds.length}`;
  }

  return "";
}

function detailSubline(props: LibraryEntryDetailPaneProps): string | null {
  const { selection } = props;
  if (!selection || selection.kind === "srd" || selection.kind === "srd-entity") return null;
  if (selection.kind === "character") {
    const character = props.characters.find((c) => c.id === selection.id);
    return character ? characterSummary(character.player) : null;
  }
  if (props.entry) return formatEntryShelfLine(props.entry);
  return null;
}

export default function LibraryEntryDetailPane(props: LibraryEntryDetailPaneProps) {
  const { selection, entry } = props;
  const markdown = detailMarkdown(props);
  const subline = detailSubline(props);
  const visual = entry ? ciClassVisual(entry.ciClass) : null;

  if (!selection) {
    return (
      <div className="library-detail-pane flex min-h-0 flex-1 flex-col rounded-lg border p-4 text-sm text-[var(--muted)]"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <p>Select an entry from the stacks to read it here — or open the {PREVIEW_WINDOW} for export.</p>
      </div>
    );
  }

  if (selection.kind === "srd" || selection.kind === "srd-entity") {
    return (
      <div
        className="library-detail-pane flex min-h-0 flex-1 flex-col rounded-lg border p-4 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <h3 className="font-display text-base font-bold text-[var(--text)]">{selection.name}</h3>
        <p className="mt-2 text-[var(--muted)]">
          SRD reference — open the {PREVIEW_WINDOW} popup for the full read-only page.
        </p>
      </div>
    );
  }

  const title =
    entry?.title ??
    (selection.kind === "npc"
      ? props.npcs.find((n) => n.id === selection.id)?.name
      : selection.kind === "location"
        ? props.locations.find((l) => l.id === selection.id)?.name
        : selection.kind === "session"
          ? props.sessionRecords.find((r) => r.id === selection.id)?.title
          : "Selected entry");

  return (
    <div
      className="library-detail-pane flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="shrink-0 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center gap-2">
          {visual ? (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ borderColor: visual.accent, color: visual.accent }}
            >
              <span aria-hidden="true">{visual.icon} </span>
              {entry ? fantasyCiLabel(entry.ciClass) : "CF"}
            </span>
          ) : null}
          <h3 className="min-w-0 flex-1 font-display text-base font-bold text-[var(--text)]">
            {title}
          </h3>
        </div>
        {subline ? <p className="mt-1 text-xs text-[var(--muted)]">{subline}</p> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {markdown.trim() ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text)]">
            {markdown}
          </pre>
        ) : (
          <p className="text-sm text-[var(--muted)]">No notes yet for this entry.</p>
        )}
      </div>
    </div>
  );
}
