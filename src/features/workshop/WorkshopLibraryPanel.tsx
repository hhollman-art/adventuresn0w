"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { THE_LIBRARY } from "@/lib/workplace/forgeLexicon";
import { APP_ICONS } from "@/lib/ui/appIcons";
import {
  campaignToLibraryEntry,
  characterToLibraryEntry,
  filterLibraryEntries,
  gameItemToLibraryEntry,
  LIBRARY_ORIGIN_LABEL,
  LIBRARY_PROVENANCE_DESCRIPTION,
  LIBRARY_PROVENANCE_LABEL,
  LIBRARY_PROVENANCE_STORAGE,
  LIBRARY_PROVENANCE_TIERS,
  locationToLibraryEntry,
  npcToLibraryEntry,
  partyToLibraryEntry,
  resultToLibraryEntry,
  seedToLibraryEntry,
  sessionRecordToLibraryEntry,
  customSrdToLibraryEntry,
  sortLibraryEntries,
  type LibraryListEntry,
  type LibraryProvenance,
  type WorkshopLibraryCategory,
} from "@/lib/workshop/libraryCatalog";
import {
  browseEmptyMessage,
  ciClassFilterOptions,
  filterBrowseEntries,
  formatEntryShelfLine,
  fantasyCiLabel,
  libraryShelfHint,
  type LibraryBrowseProvenanceFilter,
  type LibraryCrBandFilter,
  type LibrarySpellLevelFilter,
} from "@/lib/workshop/libraryBrowseFilters";
import { ciClassVisual } from "@/lib/ui/ciClassVisuals";
import LibraryActionsMenu from "@/features/workshop/LibraryActionsMenu";
import LibraryBrowseToolbar from "@/features/workshop/LibraryBrowseToolbar";
import LibraryEntryDetailPane from "@/features/workshop/LibraryEntryDetailPane";
import LibraryTwoPaneBrowse from "@/features/workshop/LibraryTwoPaneBrowse";
import LibraryThreePaneBrowse from "@/features/workshop/LibraryThreePaneBrowse";
import {
  listSrdItemLibraryEntries,
  listSrdMonstersLibraryEntries,
  listSrdRulesLibraryEntries,
  listSrdRuleBundleLibraryEntries,
  listSrdSpellsLibraryEntries,
} from "@/lib/srd/corpus";
import {
  buildLibraryBackup,
  describeRestoreCounts,
  parseLibraryBackup,
  restoreLibraryBackup,
  serializeLibraryBackup,
  suggestedBackupFilename,
  type RestoreOutcome,
} from "@/lib/workshop/libraryBackup";
import {
  connectSyncFolder,
  disconnectSyncFolder,
  getLibrarySyncStatus,
  reconnectSyncFolder,
  scheduleLibrarySnapshot,
  writeLibrarySnapshot,
  SYNC_FILE_NAME,
  type LibrarySyncStatus,
} from "@/lib/workshop/librarySync";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { RealmScopeTag, SavedRealmSeed, SeedKind } from "@/lib/realmSeeds";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedSessionRecord } from "@/lib/sessions/record";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import { queuePartyImport } from "@/lib/tabletop/partyCampaign";
import { collectUserSeedTags, filterSeeds, seedTagLabel } from "@/lib/seedTags";
import type { CiClass } from "@/lib/ciRegistry";
import AddPartyDialog from "@/features/workshop/AddPartyDialog";
import CreateArtifactModal from "@/features/workshop/CreateArtifactModal";
import SrdLibraryBrowser from "@/features/workshop/SrdLibraryBrowser";
import type { SrdApiResource } from "@/lib/srd/dnd5eApi";
import type { SrdEntityId, SrdRuleBundleId } from "@/lib/srd/types";
import type { SavedCustomSrdEntry } from "@/lib/srd/srdCustomLibrary";
import type { CloneSrdResult } from "@/lib/srd/cloneSrdEntity";
import { setSrdEntityDragData } from "@/lib/srd/srdDragDrop";
import { setVaultDragData } from "@/lib/vault/cfDragDrop";
import { vaultPayloadForTarget, libraryEntryToContextTarget } from "@/lib/workshop/cfContextActions";
import CfContextMenu from "@/features/ui/CfContextMenu";
import {
  getActiveCampaignId,
  getCampaign,
  onActiveCampaignChanged,
  onCampaignsChanged,
  type SavedCampaign,
} from "@/lib/campaigns";

export type LibraryViewSelection =
  | { kind: "seed"; id: string }
  | { kind: "result"; id: string }
  | { kind: "character"; id: string }
  | { kind: "item"; id: string }
  | { kind: "party"; id: string }
  | { kind: "campaign"; id: string }
  | { kind: "npc"; id: string }
  | { kind: "location"; id: string }
  | { kind: "session"; id: string }
  | { kind: "srd"; resource: SrdApiResource; index: string; name: string }
  | { kind: "srd-entity"; entityId: SrdEntityId; name: string }
  | { kind: "srd-bundle"; bundleId: SrdRuleBundleId; name: string }
  | { kind: "custom-srd"; id: string }
  | null;

export function libraryViewSelectionKey(selection: LibraryViewSelection): string | null {
  if (!selection) return null;
  switch (selection.kind) {
    case "srd":
      return `srd:${selection.resource}:${selection.index}`;
    case "srd-entity":
      return `srd-entity:${selection.entityId}`;
    case "srd-bundle":
      return `srd-bundle:${selection.bundleId}`;
    default:
      return `${selection.kind}:${selection.id}`;
  }
}

export function libraryViewSelectionFromEntry(
  entry: LibraryListEntry,
): NonNullable<LibraryViewSelection> {
  if (entry.ciClass === "rules.custom-entry") return { kind: "custom-srd", id: entry.id };
  if (entry.srdBundleId) {
    return { kind: "srd-bundle", bundleId: entry.srdBundleId, name: entry.title };
  }
  if (entry.srdEntityId) {
    return { kind: "srd-entity", entityId: entry.srdEntityId, name: entry.title };
  }
  if (entry.srdItemRef) {
    return {
      kind: "srd",
      resource: entry.srdItemRef.resource,
      index: entry.srdItemRef.index,
      name: entry.title,
    };
  }
  switch (entry.category) {
    case "seeds":
      return { kind: "seed", id: entry.id };
    case "results":
      return { kind: "result", id: entry.id };
    case "characters":
      return { kind: "character", id: entry.id };
    case "items":
      return { kind: "item", id: entry.id };
    case "parties":
      return { kind: "party", id: entry.id };
    case "campaigns":
      return { kind: "campaign", id: entry.id };
    case "sessions":
      return { kind: "session", id: entry.id };
    case "world":
      return entry.ciClass === "location.record"
        ? { kind: "location", id: entry.id }
        : { kind: "npc", id: entry.id };
    default:
      return { kind: "result", id: entry.id };
  }
}

function shelfEntriesForCategory(
  all: LibraryListEntry[],
  tab: WorkshopLibraryCategory,
): LibraryListEntry[] {
  return filterLibraryEntries(all, tab);
}

type WorkshopLibraryPanelProps = {
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  characters: SavedCharacter[];
  items: SavedGameItem[];
  parties: SavedCharacterRoster[];
  campaigns: SavedCampaign[];
  npcs: SavedNpc[];
  locations: SavedLocation[];
  sessionRecords: SavedSessionRecord[];
  customSrdEntries: SavedCustomSrdEntry[];
  category: WorkshopLibraryCategory;
  selection: LibraryViewSelection;
  statusMessage: string | null;
  /** The SRD reference browser is a Library feature, toggled open over the list. */
  srdOpen: boolean;
  onSrdOpenChange: (open: boolean) => void;
  onCategoryChange: (category: WorkshopLibraryCategory) => void;
  onSelect: (selection: LibraryViewSelection) => void;
  onAddSeed: () => void;
  onEditSeed: (id: string) => void;
  onDeleteSeed: (id: string) => void;
  onDeleteResult: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
  onDeleteItem: (id: string) => void;
  /** Refresh parent item list after Create Artifact / other local writes. */
  onItemsChange?: (items: SavedGameItem[]) => void;
  onDeleteParty: (id: string) => void;
  onDeleteNpc: (id: string) => void;
  onDeleteLocation: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onEditCustomSrd?: (id: string) => void;
  onDeleteCustomSrd?: (id: string) => void;
  onCustomSrdCloned?: (result: CloneSrdResult) => void;
  onCustomSrdBulkCloned?: (results: CloneSrdResult[]) => void;
  onAddNpc?: () => void;
  onAddLocation?: () => void;
  onAddSession?: () => void;
  onPartiesChange: (parties: SavedCharacterRoster[]) => void;
  /** Called after a backup restore so the parent can refresh all lists. */
  onRestore: (outcome: RestoreOutcome) => void;
  onStatus: (message: string | null) => void;
  /** Fills the browse column in the wide library layout. */
  wideLayout?: boolean;
  /** Split-pane Library: nav + dense list only; Scrying panel lives outside this panel. */
  inlineScryingLayout?: boolean;
};

function ProvenanceBadge({ provenance }: { provenance: LibraryProvenance }) {
  const tone =
    provenance === "srd"
      ? { border: "var(--accent)", color: "var(--accent)", bg: "rgba(201,162,39,0.12)" }
      : { border: "var(--border)", color: "var(--text)", bg: "var(--bg)" };

  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        borderColor: tone.border,
        color: tone.color,
        background: tone.bg,
      }}
    >
      {LIBRARY_PROVENANCE_LABEL[provenance]}
    </span>
  );
}

/** Marks custom homebrew artifacts created via Library Create Artifact. */
function HomebrewTag() {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        borderColor: "rgba(120, 70, 160, 0.45)",
        color: "rgb(120, 70, 160)",
        background: "rgba(120, 70, 160, 0.08)",
      }}
      title="Custom homebrew — yours on this device, not from the included rules"
    >
      Homebrew
    </span>
  );
}

/** Marks user-tier items that were made in the app rather than brought in. */
function CreationTag() {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        borderColor: "rgba(120,90,20,0.35)",
        color: "var(--muted)",
        background: "rgba(201,162,39,0.08)",
      }}
      title="Made in the app — saved once with your imports, in your auto-save folder"
    >
      {LIBRARY_ORIGIN_LABEL.creation}
    </span>
  );
}

/** Plain-language "where does my data live" explainer, one card per tier. */
function DataStorageExplainer({
  syncStatus,
}: {
  syncStatus: LibrarySyncStatus;
}) {
  return (
    <div
      className="rounded-lg border p-3 text-xs leading-relaxed"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <p className="text-[var(--muted)]">
        Two kinds of data live in your library. Only the included SRD rules are
        hosted by D&amp;D Easy — everything else is yours, saved once whether you
        imported it or created it in the app (creations just carry a{" "}
        <strong className="text-[var(--text)]">{LIBRARY_ORIGIN_LABEL.creation}</strong> tag).
        It all goes to <strong className="text-[var(--text)]">your auto-save folder</strong>:
        a local directory or a cloud-synced folder (OneDrive, Google Drive,
        Dropbox) that you point the app at once. Every change writes{" "}
        <code>{SYNC_FILE_NAME}</code> there automatically. Saving is{" "}
        <strong className="text-[var(--text)]">one-way</strong>: the app only writes
        to the folder and never reads from it on its own — data comes back in
        only when you choose <strong className="text-[var(--text)]">Restore backup</strong>.
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {LIBRARY_PROVENANCE_TIERS.map((tier) => (
          <li
            key={tier}
            className="rounded-md border p-2"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="flex flex-wrap items-center gap-2">
              <ProvenanceBadge provenance={tier} />
              <span className="font-semibold text-[var(--text)]">
                {LIBRARY_PROVENANCE_STORAGE[tier]}
              </span>
            </span>
            <span className="mt-1 block text-[var(--muted)]">
              {LIBRARY_PROVENANCE_DESCRIPTION[tier]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[var(--muted)]">
        {syncStatus.state === "on" ? (
          <>
            Auto-save is on — writing to “{syncStatus.folderName}”. Backup and folder
            controls are under <strong className="text-[var(--text)]">Actions</strong> in
            the header.{" "}
          </>
        ) : (
          <>
            Backup and auto-save live under{" "}
            <strong className="text-[var(--text)]">Actions</strong> in the Library header.{" "}
          </>
        )}
        Without an auto-save folder or a backup file, your data exists only in this
        browser and clearing browser data deletes it. See{" "}
        <Link href="/legal" className="font-semibold text-[var(--accent)] underline">
          Licenses &amp; content
        </Link>{" "}
        for what you may import from books you own.
      </p>
    </div>
  );
}

function isSelected(selection: LibraryViewSelection, entry: LibraryListEntry): boolean {
  if (!selection) return false;
  if (entry.ciClass === "rules.custom-entry" && selection.kind === "custom-srd") {
    return selection.id === entry.id;
  }
  if (entry.srdBundleId && selection.kind === "srd-bundle") {
    return selection.bundleId === entry.srdBundleId;
  }
  if (entry.srdEntityId && selection.kind === "srd-entity") {
    return selection.entityId === entry.srdEntityId;
  }
  if (entry.srdItemRef && selection.kind === "srd") {
    return (
      selection.resource === entry.srdItemRef.resource &&
      selection.index === entry.srdItemRef.index
    );
  }
  const kindMap = {
    seeds: "seed",
    results: "result",
    characters: "character",
    items: "item",
    world: entry.ciClass === "location.record" ? "location" : "npc",
    parties: "party",
    campaigns: "campaign",
    sessions: "session",
  } as const;
  const expectedKind = kindMap[entry.category as keyof typeof kindMap];
  if (!expectedKind || selection.kind !== expectedKind) return false;
  return "id" in selection && selection.id === entry.id;
}

function LibraryEntryRow({
  entry,
  selected,
  onView,
  onEdit,
  onDelete,
  compact = true,
}: {
  entry: LibraryListEntry;
  selected: boolean;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  compact?: boolean;
}) {
  const visual = ciClassVisual(entry.ciClass);
  const metaBits = [
    entry.spellLevel != null
      ? entry.spellLevel === 0
        ? "Cantrip"
        : `Lv ${entry.spellLevel}`
      : null,
    entry.challengeRating ? `CR ${entry.challengeRating}` : null,
    compact ? null : formatEntryShelfLine(entry),
  ].filter(Boolean);
  return (
    <CfContextMenu
      target={libraryEntryToContextTarget(entry)}
      onInspect={onView}
      onQuickEdit={onEdit}
      onDelete={onDelete}
    >
      {(bind) => (
    <li
      draggable
      {...bind}
      onDragStart={(e) => {
        const payload = vaultPayloadForTarget(libraryEntryToContextTarget(entry));
        setVaultDragData(e.dataTransfer, payload);
        e.dataTransfer.effectAllowed = "copyMove";
        if (entry.srdEntityId) {
          setSrdEntityDragData(e.dataTransfer, {
            entityId: entry.srdEntityId,
            name: entry.title,
          });
        }
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView();
          }
        }}
        className={`library-entry-row library-entry-card rounded-md border border-[var(--border)] text-sm text-slate-100${
          compact ? " library-entry-row--compact" : " p-3"
        }${
          entry.ciClass === "item.magic" || entry.ciClass === "item.srd-magic"
            ? " library-entry-row--magical"
            : ""
        }`}
        data-ci-class={entry.ciClass}
        style={{
          borderLeftWidth: "3px",
          borderLeftColor: visual.accent,
          background: selected ? "var(--dmms-panel-hover, var(--surface))" : "var(--surface)",
        }}
      >
        <span className="library-entry-icon" style={{ color: visual.accent }} aria-hidden="true">
          {visual.icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-x-2 gap-y-0.5">
            <span className="library-entry-title font-display font-semibold leading-tight text-slate-100">
              {entry.title}
            </span>
            <span
              className="library-entry-kind-badge rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide"
              style={{ borderColor: visual.accent, color: visual.accent }}
              title={entry.ciClass}
            >
              {fantasyCiLabel(entry.ciClass)}
            </span>
            {compact ? (
              <ProvenanceBadge provenance={entry.provenance} />
            ) : (
              <>
                <ProvenanceBadge provenance={entry.provenance} />
                {entry.isHomebrew ? <HomebrewTag /> : null}
                {entry.origin === "creation" && !entry.isHomebrew ? <CreationTag /> : null}
              </>
            )}
            {entry.isHomebrew && compact ? <HomebrewTag /> : null}
          </span>
          <span className="library-entry-shelf mt-0.5 block truncate text-[11px] leading-snug text-slate-400">
            {metaBits.join(" · ") || formatEntryShelfLine(entry)}
            {!compact && entry.provenance === "user" ? (
              <> · {new Date(entry.createdAt).toLocaleDateString()}</>
            ) : null}
          </span>
          {!compact && entry.detail ? (
            <span className="library-entry-detail mt-1 block text-xs text-slate-400 line-clamp-2">{entry.detail}</span>
          ) : null}
          {!compact && entry.tags?.length ? (
            <span className="library-entry-tags mt-1.5 flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  {seedTagLabel(tag)}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </li>
      )}
    </CfContextMenu>
  );
}

export default function WorkshopLibraryPanel({
  seeds,
  results,
  characters,
  items,
  parties,
  campaigns,
  npcs = [],
  locations = [],
  sessionRecords = [],
  customSrdEntries = [],
  category,
  selection,
  statusMessage,
  srdOpen,
  onSrdOpenChange,
  onCategoryChange,
  onSelect,
  onAddSeed,
  onEditSeed,
  onDeleteSeed,
  onDeleteResult,
  onDeleteCharacter,
  onDeleteItem,
  onItemsChange,
  onDeleteParty,
  onDeleteNpc,
  onDeleteLocation,
  onDeleteSession,
  onEditCustomSrd,
  onDeleteCustomSrd,
  onCustomSrdCloned,
  onCustomSrdBulkCloned,
  onAddNpc,
  onAddLocation,
  onAddSession,
  onPartiesChange,
  onRestore,
  onStatus,
  wideLayout = false,
  inlineScryingLayout = false,
}: WorkshopLibraryPanelProps) {
  const splitScrying = wideLayout && inlineScryingLayout;
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [showCreateArtifact, setShowCreateArtifact] = useState(false);
  const [syncStatus, setSyncStatus] = useState<LibrarySyncStatus>({ state: "off" });

  useEffect(() => {
    let cancelled = false;
    void getLibrarySyncStatus().then((status) => {
      if (!cancelled) setSyncStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showAddParty, setShowAddParty] = useState(false);
  const [seedKindFilter, setSeedKindFilter] = useState<SeedKind | "all">("all");
  const [seedTagFilter, setSeedTagFilter] = useState<string | "all">("all");
  const [seedScopeFilter, setSeedScopeFilter] = useState<RealmScopeTag | "all">("all");

  /** Open campaign: when set (and scoping is on) the list shows only its content. */
  const [activeCampaign, setActiveCampaign] = useState<SavedCampaign | null>(null);
  const [campaignScope, setCampaignScope] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ciClassFilter, setCiClassFilter] = useState<CiClass | "all">("all");
  const [provenanceFilter, setProvenanceFilter] =
    useState<LibraryBrowseProvenanceFilter>("all");
  const [spellLevelFilter, setSpellLevelFilter] = useState<LibrarySpellLevelFilter>("all");
  const [crBandFilter, setCrBandFilter] = useState<LibraryCrBandFilter>("all");

  const srdItemEntries = useMemo(() => listSrdItemLibraryEntries(), []);
  const srdSpellEntries = useMemo(() => listSrdSpellsLibraryEntries(), []);
  const srdRuleBundleEntries = useMemo(() => listSrdRuleBundleLibraryEntries(), []);
  const srdRulesEntries = useMemo(() => listSrdRulesLibraryEntries(), []);
  const srdMonsterEntries = useMemo(() => listSrdMonstersLibraryEntries(), []);

  useEffect(() => {
    let cancelled = false;
    const refreshCampaign = async () => {
      const id = getActiveCampaignId();
      const campaign = id ? await getCampaign(id) : null;
      if (!cancelled) setActiveCampaign(campaign);
    };
    void refreshCampaign();
    const offActive = onActiveCampaignChanged(() => void refreshCampaign());
    const offCampaigns = onCampaignsChanged(() => void refreshCampaign());
    return () => {
      cancelled = true;
      offActive();
      offCampaigns();
    };
  }, []);

  const scopedToCampaign = activeCampaign !== null && campaignScope;
  const campaignSeeds = useMemo(
    () =>
      scopedToCampaign
        ? seeds.filter((s) => activeCampaign.seedIds.includes(s.id))
        : seeds,
    [scopedToCampaign, seeds, activeCampaign],
  );
  const campaignResults = useMemo(
    () =>
      scopedToCampaign
        ? results.filter((r) => activeCampaign.resultIds.includes(r.id))
        : results,
    [scopedToCampaign, results, activeCampaign],
  );
  const campaignParties = useMemo(
    () =>
      scopedToCampaign
        ? parties.filter((p) => p.id === activeCampaign.partyId)
        : parties,
    [scopedToCampaign, parties, activeCampaign],
  );
  const campaignCharacters = useMemo(
    () =>
      scopedToCampaign
        ? characters.filter((c) => activeCampaign.characterIds.includes(c.id))
        : characters,
    [scopedToCampaign, characters, activeCampaign],
  );
  const campaignItems = useMemo(
    () =>
      scopedToCampaign
        ? items.filter((i) => activeCampaign.itemIds.includes(i.id))
        : items,
    [scopedToCampaign, items, activeCampaign],
  );
  const campaignNpcs = useMemo(
    () =>
      scopedToCampaign ? npcs.filter((n) => activeCampaign.npcIds.includes(n.id)) : npcs,
    [scopedToCampaign, npcs, activeCampaign],
  );
  const campaignLocations = useMemo(
    () =>
      scopedToCampaign
        ? locations.filter((l) => activeCampaign.locationIds.includes(l.id))
        : locations,
    [scopedToCampaign, locations, activeCampaign],
  );
  const campaignSessionRecords = useMemo(
    () =>
      scopedToCampaign
        ? sessionRecords.filter((r) => activeCampaign.sessionRecordIds.includes(r.id))
        : sessionRecords,
    [scopedToCampaign, sessionRecords, activeCampaign],
  );
  const campaignRecords = useMemo(
    () =>
      scopedToCampaign ? campaigns.filter((c) => c.id === activeCampaign.id) : campaigns,
    [scopedToCampaign, campaigns, activeCampaign],
  );

  const filteredSeeds = useMemo(
    () =>
      filterSeeds(campaignSeeds, {
        kindFilter: seedKindFilter,
        tagFilter: seedTagFilter,
        scopeFilter: seedScopeFilter,
      }),
    [campaignSeeds, seedKindFilter, seedTagFilter, seedScopeFilter],
  );

  const includeSrdItems = category === "all" || category === "items";
  const includeSrdRules = category === "all" || category === "rules";
  const includeSrdMonsters = category === "all" || category === "monsters";

  const allEntries = useMemo(() => {
    const srdItemsForShelf = includeSrdItems ? srdItemEntries : [];
    const srdSpellsForShelf = includeSrdRules ? srdSpellEntries : [];
    const srdRulesForShelf = includeSrdRules
      ? [...srdRuleBundleEntries, ...srdRulesEntries]
      : [];
    const srdMonstersForShelf = includeSrdMonsters ? srdMonsterEntries : [];
    return sortLibraryEntries([
      ...filteredSeeds.map(seedToLibraryEntry),
      ...campaignResults.map(resultToLibraryEntry),
      ...campaignCharacters.map(characterToLibraryEntry),
      ...campaignItems.map(gameItemToLibraryEntry),
      ...customSrdEntries.map(customSrdToLibraryEntry),
      ...campaignNpcs.map(npcToLibraryEntry),
      ...campaignLocations.map(locationToLibraryEntry),
      ...campaignSessionRecords.map(sessionRecordToLibraryEntry),
      ...srdItemsForShelf,
      ...srdSpellsForShelf,
      ...srdRulesForShelf,
      ...srdMonstersForShelf,
      ...campaignParties.map(partyToLibraryEntry),
      ...campaignRecords.map(campaignToLibraryEntry),
    ]);
  }, [
    includeSrdItems,
    includeSrdRules,
    includeSrdMonsters,
    srdItemEntries,
    srdSpellEntries,
    srdRuleBundleEntries,
    srdRulesEntries,
    srdMonsterEntries,
    filteredSeeds,
    campaignResults,
    campaignCharacters,
    campaignItems,
    customSrdEntries,
    campaignNpcs,
    campaignLocations,
    campaignSessionRecords,
    campaignParties,
    campaignRecords,
  ]);

  const shelfCounts = useMemo(
    (): Record<WorkshopLibraryCategory, number> => ({
      all: allEntries.length,
      seeds: shelfEntriesForCategory(allEntries, "seeds").length,
      results: shelfEntriesForCategory(allEntries, "results").length,
      characters: shelfEntriesForCategory(allEntries, "characters").length,
      items: shelfEntriesForCategory(allEntries, "items").length,
      world: shelfEntriesForCategory(allEntries, "world").length,
      rules: shelfEntriesForCategory(allEntries, "rules").length,
      monsters: shelfEntriesForCategory(allEntries, "monsters").length,
      parties: shelfEntriesForCategory(allEntries, "parties").length,
      campaigns: shelfEntriesForCategory(allEntries, "campaigns").length,
      sessions: shelfEntriesForCategory(allEntries, "sessions").length,
    }),
    [allEntries],
  );

  const shelfEntries = useMemo(
    () => shelfEntriesForCategory(allEntries, category),
    [allEntries, category],
  );

  const ciClassOptions = useMemo(
    () => ciClassFilterOptions(category, shelfEntries),
    [category, shelfEntries],
  );

  const entries = useMemo(
    () =>
      filterBrowseEntries(shelfEntries, {
        search: searchQuery,
        ciClass: ciClassFilter,
        provenance: provenanceFilter,
        spellLevel: spellLevelFilter,
        crBand: crBandFilter,
      }),
    [shelfEntries, searchQuery, ciClassFilter, provenanceFilter, spellLevelFilter, crBandFilter],
  );

  const showSpellLevelFilters = useMemo(
    () => shelfEntries.some((entry) => entry.spellLevel != null),
    [shelfEntries],
  );
  const showCrFilters = useMemo(
    () => shelfEntries.some((entry) => entry.challengeRating != null),
    [shelfEntries],
  );

  const seedTagOptions = useMemo(() => collectUserSeedTags(campaignSeeds), [campaignSeeds]);

  const selectedEntry = useMemo(
    () => (selection ? entries.find((e) => isSelected(selection, e)) ?? null : null),
    [selection, entries],
  );

  const onExportBackup = async () => {
    onStatus(null);
    const backup = await buildLibraryBackup();
    const total =
      backup.seeds.length +
      backup.results.length +
      backup.characters.length +
      backup.items.length +
      backup.parties.length +
      backup.campaigns.length +
      (backup.npcs?.length ?? 0) +
      (backup.locations?.length ?? 0) +
      (backup.sessionRecords?.length ?? 0);
    if (total === 0) {
      onStatus("Nothing to back up yet — your library is empty.");
      return;
    }
    const blob = new Blob([serializeLibraryBackup(backup)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedBackupFilename();
    a.click();
    URL.revokeObjectURL(url);
    onStatus(
      `Backup exported (${backup.seeds.length} CFs, ${backup.results.length} results, ${backup.characters.length} heroes, ${backup.items.length} items, ${backup.npcs?.length ?? 0} NPCs, ${backup.locations?.length ?? 0} locations, ${backup.sessionRecords?.length ?? 0} session logs, ${backup.parties.length} parties, ${backup.campaigns.length} campaigns). Save it anywhere you like — folder, cloud drive, or repository.`,
    );
  };

  const onRestoreBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onStatus(null);
    const parsed = parseLibraryBackup(await file.text());
    if (!parsed.ok) {
      onStatus(parsed.error);
      e.target.value = "";
      return;
    }
    const outcome = await restoreLibraryBackup(parsed);
    onRestore(outcome);
    scheduleLibrarySnapshot();
    onStatus(describeRestoreCounts(outcome.counts));
    e.target.value = "";
  };

  const onChooseSyncFolder = async () => {
    onStatus(null);
    const result = await connectSyncFolder();
    if (!result.ok) {
      if (!result.cancelled && result.error) onStatus(result.error);
      return;
    }
    // One-directional: never read the folder's contents into the app.
    // If a library file already exists there, hold off writing so the DM can
    // explicitly Restore backup from it first if they want to.
    if (result.hadExistingSnapshot) {
      setSyncStatus(await getLibrarySyncStatus());
      onStatus(
        `Auto-save is on for “${result.folderName}”. That folder already contains ${SYNC_FILE_NAME} — it will be replaced the next time your library changes. To load its contents into the app first, use Restore backup under “Where is my data?”.`,
      );
      return;
    }
    await writeLibrarySnapshot();
    setSyncStatus(await getLibrarySyncStatus());
    onStatus(
      `Auto-save is on. Your library now saves to “${result.folderName}” after every change.`,
    );
  };

  const onReconnectSync = async () => {
    const status = await reconnectSyncFolder();
    setSyncStatus(status);
    if (status.state === "on") {
      await writeLibrarySnapshot();
      onStatus(`Auto-save re-enabled — saving to “${status.folderName}”.`);
    } else {
      onStatus("Couldn't re-enable auto-save. Try choosing the folder again.");
    }
  };

  const onDisconnectSync = async () => {
    await disconnectSyncFolder();
    setSyncStatus(await getLibrarySyncStatus());
    onStatus(
      "Auto-save turned off. Files already in your folder are kept; new changes stay in this browser only.",
    );
  };

  const loadPartyToVtt = (rosterId: string) => {
    queuePartyImport({
      rosterId,
      placeTokens: true,
      linkCampaign: true,
      replaceExisting: true,
    });
    onStatus("Opening Virtual Table with your party…");
    window.location.href = "/table";
  };

  return (
    <div
      className={
        wideLayout
          ? `library-browse-panel${splitScrying ? " library-browse-panel--dense" : ""}`
          : "mt-6 flex flex-col gap-3 rounded-lg border p-4"
      }
      style={wideLayout ? undefined : { borderColor: "var(--border)" }}
    >
      <div className="library-workspace-header flex flex-wrap items-center justify-between gap-1 shrink-0">
        <div className="min-w-0">
          {!wideLayout ? (
            <h2 className="font-display text-base font-bold text-[var(--text)]">
              <span aria-hidden="true">{APP_ICONS.library} </span>
              {THE_LIBRARY}
            </h2>
          ) : null}
          {!splitScrying ? (
            <p className={`text-xs leading-relaxed text-[var(--muted)]${wideLayout ? "" : " mt-1"}`}>
              {libraryShelfHint(category)}{" "}
              {syncStatus.state === "on" ? (
                <>
                  Your collection auto-saves to{" "}
                  <strong className="text-[var(--text)]">“{syncStatus.folderName}”</strong>.
                </>
              ) : syncStatus.state === "needs-permission" ? (
                <>Auto-save is paused — re-allow folder access when you can.</>
              ) : (
                <>Choose an auto-save folder so your archives survive beyond this browser.</>
              )}{" "}
              <button
                type="button"
                onClick={() => setShowStorageInfo((v) => !v)}
                className="font-semibold text-[var(--accent)] underline"
                aria-expanded={showStorageInfo}
              >
                {showStorageInfo ? "Hide vault notes" : "Where is my data?"}
              </button>
            </p>
          ) : syncStatus.state === "on" ? (
            <p className="text-[11px] text-[var(--muted)]">
              Auto-save: <strong className="text-[var(--text)]">{syncStatus.folderName}</strong>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <LibraryActionsMenu
            syncState={syncStatus.state}
            onChooseFolder={() => void onChooseSyncFolder()}
            onReconnect={() => void onReconnectSync()}
            onDisconnect={() => void onDisconnectSync()}
            onExport={() => void onExportBackup()}
            onRestoreFile={(e) => void onRestoreBackup(e)}
          />
          <button
            type="button"
            onClick={() => {
              if (!srdOpen) onCategoryChange("rules");
              onSrdOpenChange(!srdOpen);
            }}
            className={`btn btn-sm${srdOpen ? " btn-accent" : ""}`}
            aria-pressed={srdOpen}
            title="Browse the read-only SRD reference that ships with the app"
          >
            {srdOpen ? "Close rule tomes" : "Browse rule tomes"}
          </button>
          <button
            type="button"
            onClick={() => setShowAddParty(true)}
            className="btn btn-sm"
          >
            Gather a fellowship
          </button>
          <button
            type="button"
            onClick={() => setShowCreateArtifact(true)}
            className="btn btn-sm btn-accent"
            title="Add a custom homebrew magic item to your Library"
          >
            + Create Artifact
          </button>
          <button type="button" onClick={onAddSeed} className="btn btn-sm btn-accent">
            Plant a CF
          </button>
          {onAddNpc && (category === "world" || category === "all") ? (
            <button type="button" onClick={onAddNpc} className="btn btn-sm">
              Add NPC
            </button>
          ) : null}
          {onAddLocation && (category === "world" || category === "all") ? (
            <button type="button" onClick={onAddLocation} className="btn btn-sm">
              Add location
            </button>
          ) : null}
          {onAddSession && (category === "sessions" || category === "all") ? (
            <button type="button" onClick={onAddSession} className="btn btn-sm">
              Log session
            </button>
          ) : null}
        </div>
      </div>

      {showStorageInfo ? (
        <DataStorageExplainer syncStatus={syncStatus} />
      ) : null}

      {activeCampaign ? (
        <p
          className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--accent-dim)",
            background: "rgba(201,162,39,0.08)",
          }}
        >
          <span aria-hidden="true">{APP_ICONS.campaign}</span>
          <span className="text-[var(--muted)]">
            {campaignScope ? (
              <>
                Showing only the shelf for{" "}
                <strong className="text-[var(--text)]">{activeCampaign.name}</strong> — new
                creations join this chronicle automatically.
              </>
            ) : (
              <>
                All shelves are open.{" "}
                <strong className="text-[var(--text)]">{activeCampaign.name}</strong> is still
                your active chronicle.
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => setCampaignScope((v) => !v)}
            className="font-semibold text-[var(--accent)] underline"
          >
            {campaignScope ? "Show every shelf" : "Show chronicle only"}
          </button>
          <Link
            href="/campaigns"
            className="font-semibold text-[var(--accent)] underline"
          >
            Tend chronicles
          </Link>
        </p>
      ) : null}

      {!srdOpen && !wideLayout ? (
        <LibraryBrowseToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          shelf={category}
            onShelfChange={(next) => {
            onSrdOpenChange(false);
            setCiClassFilter("all");
            setSpellLevelFilter("all");
            setCrBandFilter("all");
            onCategoryChange(next);
          }}
          shelfCounts={shelfCounts}
          ciClassFilter={ciClassFilter}
          onCiClassFilterChange={setCiClassFilter}
          ciClassOptions={ciClassOptions}
          provenanceFilter={provenanceFilter}
          onProvenanceFilterChange={setProvenanceFilter}
          spellLevelFilter={spellLevelFilter}
          onSpellLevelFilterChange={setSpellLevelFilter}
          showSpellLevelFilters={showSpellLevelFilters}
          crBandFilter={crBandFilter}
          onCrBandFilterChange={setCrBandFilter}
          showCrFilters={showCrFilters}
          showSeedRefine={category === "seeds" || category === "all"}
          seedKindFilter={seedKindFilter}
          onSeedKindFilterChange={setSeedKindFilter}
          seedTagFilter={seedTagFilter}
          onSeedTagFilterChange={setSeedTagFilter}
          seedScopeFilter={seedScopeFilter}
          onSeedScopeFilterChange={setSeedScopeFilter}
          seedTagOptions={seedTagOptions}
          searchAction={
            <button
              type="button"
              onClick={() => setShowCreateArtifact(true)}
              className="btn btn-sm btn-accent shrink-0"
              title="Add a custom homebrew magic item to your Library"
            >
              + Create Artifact
            </button>
          }
        />
      ) : null}

      {statusMessage ? (
        <p
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--accent-dim)",
            background: "rgba(201,162,39,0.1)",
          }}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      {srdOpen ? (
        <SrdLibraryBrowser
          wideLayout={wideLayout}
          selection={selection}
          onSelect={onSelect}
          onCloned={onCustomSrdCloned}
          onBulkCloned={onCustomSrdBulkCloned}
          onStatus={onStatus}
        />
      ) : wideLayout ? (
        splitScrying ? (
        <LibraryTwoPaneBrowse
          navPane={
            <LibraryBrowseToolbar
              variant="shelves-only"
              search={searchQuery}
              onSearchChange={setSearchQuery}
              shelf={category}
            onShelfChange={(next) => {
            onSrdOpenChange(false);
            setCiClassFilter("all");
            setSpellLevelFilter("all");
            setCrBandFilter("all");
            onCategoryChange(next);
          }}
              shelfCounts={shelfCounts}
              ciClassFilter={ciClassFilter}
              onCiClassFilterChange={setCiClassFilter}
              ciClassOptions={ciClassOptions}
              provenanceFilter={provenanceFilter}
              onProvenanceFilterChange={setProvenanceFilter}
            />
          }
          listPane={
            <>
              <LibraryBrowseToolbar
                variant="filters-only"
                search={searchQuery}
                onSearchChange={setSearchQuery}
                shelf={category}
            onShelfChange={(next) => {
            onSrdOpenChange(false);
            setCiClassFilter("all");
            setSpellLevelFilter("all");
            setCrBandFilter("all");
            onCategoryChange(next);
          }}
                shelfCounts={shelfCounts}
                ciClassFilter={ciClassFilter}
                onCiClassFilterChange={setCiClassFilter}
                ciClassOptions={ciClassOptions}
                provenanceFilter={provenanceFilter}
                onProvenanceFilterChange={setProvenanceFilter}
                spellLevelFilter={spellLevelFilter}
                onSpellLevelFilterChange={setSpellLevelFilter}
                showSpellLevelFilters={showSpellLevelFilters}
                crBandFilter={crBandFilter}
                onCrBandFilterChange={setCrBandFilter}
                showCrFilters={showCrFilters}
                showSeedRefine={category === "seeds" || category === "all"}
                seedKindFilter={seedKindFilter}
                onSeedKindFilterChange={setSeedKindFilter}
                seedTagFilter={seedTagFilter}
                onSeedTagFilterChange={setSeedTagFilter}
                seedScopeFilter={seedScopeFilter}
                onSeedScopeFilterChange={setSeedScopeFilter}
                seedTagOptions={seedTagOptions}
                searchAction={
                  <button
                    type="button"
                    onClick={() => setShowCreateArtifact(true)}
                    className="btn btn-sm btn-accent shrink-0"
                    title="Add a custom homebrew magic item to your Library"
                  >
                    + Create Artifact
                  </button>
                }
              />
              {entries.length === 0 ? (
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {searchQuery.trim() ||
                  ciClassFilter !== "all" ||
                  provenanceFilter !== "all" ||
                  spellLevelFilter !== "all" ||
                  crBandFilter !== "all"
                    ? "No entries match your search or filters — try clearing a filter or widening your query."
                    : browseEmptyMessage(
                        category,
                        scopedToCampaign ? activeCampaign?.name : undefined,
                      )}
                </p>
              ) : (
                <ul className="library-results-grid custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                  {entries.map((entry) => {
                    const selected = isSelected(selection, entry);
                    const select = () => {
                      if (entry.srdBundleId) {
                        onSelect({
                          kind: "srd-bundle",
                          bundleId: entry.srdBundleId,
                          name: entry.title,
                        });
                        return;
                      }
                      if (entry.srdEntityId) {
                        onSelect({
                          kind: "srd-entity",
                          entityId: entry.srdEntityId,
                          name: entry.title,
                        });
                        return;
                      }
                      if (entry.srdItemRef) {
                        onSelect({
                          kind: "srd",
                          resource: entry.srdItemRef.resource,
                          index: entry.srdItemRef.index,
                          name: entry.title,
                        });
                        return;
                      }
                      if (entry.category === "seeds") onSelect({ kind: "seed", id: entry.id });
                      else if (entry.category === "results")
                        onSelect({ kind: "result", id: entry.id });
                      else if (entry.category === "characters")
                        onSelect({ kind: "character", id: entry.id });
                      else if (entry.category === "items")
                        onSelect({ kind: "item", id: entry.id });
                      else if (entry.category === "world") {
                        if (entry.ciClass === "location.record") {
                          onSelect({ kind: "location", id: entry.id });
                        } else {
                          onSelect({ kind: "npc", id: entry.id });
                        }
                      } else if (entry.category === "sessions")
                        onSelect({ kind: "session", id: entry.id });
                      else if (entry.category === "campaigns")
                        onSelect({ kind: "campaign", id: entry.id });
                      else onSelect({ kind: "party", id: entry.id });
                    };

                    if (entry.ciClass === "rules.custom-entry") {
                      return (
                        <LibraryEntryRow
                          key={`custom-srd-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={() => onSelect({ kind: "custom-srd", id: entry.id })}
                          onEdit={
                            onEditCustomSrd ? () => onEditCustomSrd(entry.id) : undefined
                          }
                          onDelete={
                            onDeleteCustomSrd ? () => onDeleteCustomSrd(entry.id) : undefined
                          }
                          editLabel="Edit copy"
                        />
                      );
                    }

                    if (entry.category === "seeds") {
                      return (
                        <LibraryEntryRow
                          key={`seed-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onEdit={() => onEditSeed(entry.id)}
                          onDelete={() => onDeleteSeed(entry.id)}
                          editLabel="Revise CF"
                        />
                      );
                    }

                    if (entry.category === "results") {
                      return (
                        <LibraryEntryRow
                          key={`result-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteResult(entry.id)}
                        />
                      );
                    }

                    if (entry.category === "characters") {
                      return (
                        <LibraryEntryRow
                          key={`character-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteCharacter(entry.id)}
                          editLabel="Manage heroes"
                          onEdit={() => {
                            window.location.href = "/tavern";
                          }}
                        />
                      );
                    }

                    if (entry.srdItemRef || entry.srdEntityId) {
                      return (
                        <LibraryEntryRow
                          key={entry.id}
                          entry={entry}
                          selected={selected}
                          onView={select}
                        />
                      );
                    }

                    if (entry.category === "items") {
                      return (
                        <LibraryEntryRow
                          key={`item-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteItem(entry.id)}
                        />
                      );
                    }

                    if (entry.category === "world") {
                      const isNpc = entry.ciClass === "npc.record";
                      return (
                        <LibraryEntryRow
                          key={`world-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() =>
                            isNpc ? onDeleteNpc(entry.id) : onDeleteLocation(entry.id)
                          }
                        />
                      );
                    }

                    if (entry.category === "sessions") {
                      return (
                        <LibraryEntryRow
                          key={`session-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteSession(entry.id)}
                        />
                      );
                    }

                    if (entry.category === "campaigns") {
                      return (
                        <LibraryEntryRow
                          key={`campaign-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          editLabel="Tend chronicle"
                          onEdit={() => {
                            window.location.href = "/campaigns";
                          }}
                        />
                      );
                    }

                    return (
                      <LibraryEntryRow
                        key={`party-${entry.id}`}
                        entry={entry}
                        selected={selected}
                        onView={select}
                        onDelete={() => onDeleteParty(entry.id)}
                        editLabel="Gather fellowship"
                        onEdit={() => {
                          window.location.href = "/tavern";
                        }}
                      />
                    );
                  })}
                </ul>
              )}
            </>
          }
        />
        ) : (
        <LibraryThreePaneBrowse
          navPane={
            <LibraryBrowseToolbar
              variant="shelves-only"
              search={searchQuery}
              onSearchChange={setSearchQuery}
              shelf={category}
            onShelfChange={(next) => {
            onSrdOpenChange(false);
            setCiClassFilter("all");
            setSpellLevelFilter("all");
            setCrBandFilter("all");
            onCategoryChange(next);
          }}
              shelfCounts={shelfCounts}
              ciClassFilter={ciClassFilter}
              onCiClassFilterChange={setCiClassFilter}
              ciClassOptions={ciClassOptions}
              provenanceFilter={provenanceFilter}
              onProvenanceFilterChange={setProvenanceFilter}
            />
          }
          listPane={
            <>
              <LibraryBrowseToolbar
                variant="filters-only"
                search={searchQuery}
                onSearchChange={setSearchQuery}
                shelf={category}
            onShelfChange={(next) => {
            onSrdOpenChange(false);
            setCiClassFilter("all");
            setSpellLevelFilter("all");
            setCrBandFilter("all");
            onCategoryChange(next);
          }}
                shelfCounts={shelfCounts}
                ciClassFilter={ciClassFilter}
                onCiClassFilterChange={setCiClassFilter}
                ciClassOptions={ciClassOptions}
                provenanceFilter={provenanceFilter}
                onProvenanceFilterChange={setProvenanceFilter}
                spellLevelFilter={spellLevelFilter}
                onSpellLevelFilterChange={setSpellLevelFilter}
                showSpellLevelFilters={showSpellLevelFilters}
                crBandFilter={crBandFilter}
                onCrBandFilterChange={setCrBandFilter}
                showCrFilters={showCrFilters}
                showSeedRefine={category === "seeds" || category === "all"}
                seedKindFilter={seedKindFilter}
                onSeedKindFilterChange={setSeedKindFilter}
                seedTagFilter={seedTagFilter}
                onSeedTagFilterChange={setSeedTagFilter}
                seedScopeFilter={seedScopeFilter}
                onSeedScopeFilterChange={setSeedScopeFilter}
                seedTagOptions={seedTagOptions}
                searchAction={
                  <button
                    type="button"
                    onClick={() => setShowCreateArtifact(true)}
                    className="btn btn-sm btn-accent shrink-0"
                    title="Add a custom homebrew magic item to your Library"
                  >
                    + Create Artifact
                  </button>
                }
              />
              {entries.length === 0 ? (
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {searchQuery.trim() ||
                  ciClassFilter !== "all" ||
                  provenanceFilter !== "all" ||
                  spellLevelFilter !== "all" ||
                  crBandFilter !== "all"
                    ? "No entries match your search or filters — try clearing a filter or widening your query."
                    : browseEmptyMessage(
                        category,
                        scopedToCampaign ? activeCampaign?.name : undefined,
                      )}
                </p>
              ) : (
                <ul className="library-results-grid custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                  {entries.map((entry) => {
                    const selected = isSelected(selection, entry);
                    const select = () => {
                      if (entry.srdBundleId) {
                        onSelect({
                          kind: "srd-bundle",
                          bundleId: entry.srdBundleId,
                          name: entry.title,
                        });
                        return;
                      }
                      if (entry.srdEntityId) {
                        onSelect({
                          kind: "srd-entity",
                          entityId: entry.srdEntityId,
                          name: entry.title,
                        });
                        return;
                      }
                      if (entry.srdItemRef) {
                        onSelect({
                          kind: "srd",
                          resource: entry.srdItemRef.resource,
                          index: entry.srdItemRef.index,
                          name: entry.title,
                        });
                        return;
                      }
                      if (entry.category === "seeds") onSelect({ kind: "seed", id: entry.id });
                      else if (entry.category === "results")
                        onSelect({ kind: "result", id: entry.id });
                      else if (entry.category === "characters")
                        onSelect({ kind: "character", id: entry.id });
                      else if (entry.category === "items")
                        onSelect({ kind: "item", id: entry.id });
                      else if (entry.category === "world") {
                        if (entry.ciClass === "location.record") {
                          onSelect({ kind: "location", id: entry.id });
                        } else {
                          onSelect({ kind: "npc", id: entry.id });
                        }
                      } else if (entry.category === "sessions")
                        onSelect({ kind: "session", id: entry.id });
                      else if (entry.category === "campaigns")
                        onSelect({ kind: "campaign", id: entry.id });
                      else onSelect({ kind: "party", id: entry.id });
                    };

                    if (entry.ciClass === "rules.custom-entry") {
                      return (
                        <LibraryEntryRow
                          key={`custom-srd-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={() => onSelect({ kind: "custom-srd", id: entry.id })}
                          onEdit={
                            onEditCustomSrd ? () => onEditCustomSrd(entry.id) : undefined
                          }
                          onDelete={
                            onDeleteCustomSrd ? () => onDeleteCustomSrd(entry.id) : undefined
                          }
                          editLabel="Edit copy"
                        />
                      );
                    }

                    if (entry.category === "seeds") {
                      return (
                        <LibraryEntryRow
                          key={`seed-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onEdit={() => onEditSeed(entry.id)}
                          onDelete={() => onDeleteSeed(entry.id)}
                          editLabel="Revise CF"
                        />
                      );
                    }

                    if (entry.category === "results") {
                      return (
                        <LibraryEntryRow
                          key={`result-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteResult(entry.id)}
                        />
                      );
                    }

                    if (entry.category === "characters") {
                      return (
                        <LibraryEntryRow
                          key={`character-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteCharacter(entry.id)}
                          editLabel="Manage heroes"
                          onEdit={() => {
                            window.location.href = "/tavern";
                          }}
                        />
                      );
                    }

                    if (entry.srdItemRef || entry.srdEntityId) {
                      return (
                        <LibraryEntryRow
                          key={entry.id}
                          entry={entry}
                          selected={selected}
                          onView={select}
                        />
                      );
                    }

                    if (entry.category === "items") {
                      return (
                        <LibraryEntryRow
                          key={`item-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteItem(entry.id)}
                          editLabel="Open treasury"
                          onEdit={() => {
                            window.location.href = "/items";
                          }}
                        />
                      );
                    }

                    if (entry.category === "world") {
                      const isNpc = entry.ciClass === "npc.record";
                      return (
                        <LibraryEntryRow
                          key={`world-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() =>
                            isNpc ? onDeleteNpc(entry.id) : onDeleteLocation(entry.id)
                          }
                        />
                      );
                    }

                    if (entry.category === "sessions") {
                      return (
                        <LibraryEntryRow
                          key={`session-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          onDelete={() => onDeleteSession(entry.id)}
                        />
                      );
                    }

                    if (entry.category === "campaigns") {
                      return (
                        <LibraryEntryRow
                          key={`campaign-${entry.id}`}
                          entry={entry}
                          selected={selected}
                          onView={select}
                          editLabel="Tend chronicle"
                          onEdit={() => {
                            window.location.href = "/campaigns";
                          }}
                        />
                      );
                    }

                    return (
                      <LibraryEntryRow
                        key={`party-${entry.id}`}
                        entry={entry}
                        selected={selected}
                        onView={select}
                        onDelete={() => onDeleteParty(entry.id)}
                        editLabel="Gather fellowship"
                        onEdit={() => {
                          window.location.href = "/tavern";
                        }}
                      />
                    );
                  })}
                </ul>
              )}
            </>
          }
          detailPane={
            <LibraryEntryDetailPane
              selection={selection}
              entry={selectedEntry}
              seeds={seeds}
              results={results}
              characters={characters}
              items={items}
              parties={parties}
              campaigns={campaigns}
              npcs={npcs}
              locations={locations}
              sessionRecords={sessionRecords}
              customSrdEntries={customSrdEntries}
              onCustomSrdCloned={onCustomSrdCloned}
              onStatus={onStatus}
            />
          }
        />
        )
      ) : entries.length === 0 ? (
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          {searchQuery.trim() || ciClassFilter !== "all" || provenanceFilter !== "all"
            ? "No entries match your search or filters — try clearing a filter or widening your query."
            : browseEmptyMessage(
                category,
                scopedToCampaign ? activeCampaign?.name : undefined,
              )}
        </p>
      ) : (
        <ul
          className={
            wideLayout
              ? "library-results-grid custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"
              : "library-results-grid custom-scrollbar max-h-[min(70vh,40rem)] overflow-y-auto pr-1"
          }
        >
          {entries.map((entry) => {
            const selected = isSelected(selection, entry);
            const select = () => {
              if (entry.srdBundleId) {
                onSelect({
                  kind: "srd-bundle",
                  bundleId: entry.srdBundleId,
                  name: entry.title,
                });
                return;
              }
              if (entry.srdEntityId) {
                onSelect({
                  kind: "srd-entity",
                  entityId: entry.srdEntityId,
                  name: entry.title,
                });
                return;
              }
              if (entry.srdItemRef) {
                onSelect({
                  kind: "srd",
                  resource: entry.srdItemRef.resource,
                  index: entry.srdItemRef.index,
                  name: entry.title,
                });
                return;
              }
              if (entry.category === "seeds") onSelect({ kind: "seed", id: entry.id });
              else if (entry.category === "results") onSelect({ kind: "result", id: entry.id });
              else if (entry.category === "characters")
                onSelect({ kind: "character", id: entry.id });
              else if (entry.category === "items") onSelect({ kind: "item", id: entry.id });
              else if (entry.category === "world") {
                if (entry.ciClass === "location.record") {
                  onSelect({ kind: "location", id: entry.id });
                } else {
                  onSelect({ kind: "npc", id: entry.id });
                }
              } else if (entry.category === "sessions")
                onSelect({ kind: "session", id: entry.id });
              else if (entry.category === "campaigns")
                onSelect({ kind: "campaign", id: entry.id });
              else onSelect({ kind: "party", id: entry.id });
            };

            if (entry.ciClass === "rules.custom-entry") {
              return (
                <LibraryEntryRow
                  key={`custom-srd-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={() => onSelect({ kind: "custom-srd", id: entry.id })}
                  onEdit={
                    onEditCustomSrd ? () => onEditCustomSrd(entry.id) : undefined
                  }
                  onDelete={
                    onDeleteCustomSrd ? () => onDeleteCustomSrd(entry.id) : undefined
                  }
                  editLabel="Edit copy"
                />
              );
            }

            if (entry.category === "seeds") {
              return (
                <LibraryEntryRow
                  key={`seed-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  onEdit={() => onEditSeed(entry.id)}
                  onDelete={() => onDeleteSeed(entry.id)}
                  editLabel="Revise CF"
                />
              );
            }

            if (entry.category === "results") {
              return (
                <LibraryEntryRow
                  key={`result-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  onDelete={() => onDeleteResult(entry.id)}
                />
              );
            }

            if (entry.category === "characters") {
              return (
                <LibraryEntryRow
                  key={`character-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  onDelete={() => onDeleteCharacter(entry.id)}
                  editLabel="Manage heroes"
                  onEdit={() => {
                    window.location.href = "/tavern";
                  }}
                />
              );
            }

            if (entry.srdItemRef || entry.srdEntityId) {
              return (
                <LibraryEntryRow
                  key={entry.id}
                  entry={entry}
                  selected={selected}
                  onView={select}
                />
              );
            }

            if (entry.category === "items") {
              return (
                <LibraryEntryRow
                  key={`item-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  onDelete={() => onDeleteItem(entry.id)}
                  editLabel="Open treasury"
                  onEdit={() => {
                    window.location.href = "/items";
                  }}
                />
              );
            }

            if (entry.category === "world") {
              const isNpc = entry.ciClass === "npc.record";
              return (
                <LibraryEntryRow
                  key={`world-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  onDelete={() => (isNpc ? onDeleteNpc : onDeleteLocation)(entry.id)}
                />
              );
            }

            if (entry.category === "sessions") {
              return (
                <LibraryEntryRow
                  key={`session-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  onDelete={() => onDeleteSession(entry.id)}
                />
              );
            }

            if (entry.category === "campaigns") {
              return (
                <LibraryEntryRow
                  key={`campaign-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  editLabel="Tend chronicle"
                  onEdit={() => {
                    window.location.href = "/campaigns";
                  }}
                />
              );
            }

            return (
              <LibraryEntryRow
                key={`party-${entry.id}`}
                entry={entry}
                selected={selected}
                onView={select}
                onDelete={() => onDeleteParty(entry.id)}
                editLabel="Gather fellowship"
                onEdit={() => {
                  window.location.href = "/tavern";
                }}
              />
            );
          })}
        </ul>
      )}

      {!srdOpen && parties.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          March a fellowship to the{" "}
          <button
            type="button"
            className="font-semibold text-[var(--accent)] underline"
            onClick={() => {
              const id = selection?.kind === "party" ? selection.id : parties[0]?.id;
              if (id) loadPartyToVtt(id);
            }}
          >
            Virtual Table
          </button>{" "}
          or tend them on the{" "}
          <Link href="/tavern" className="font-semibold text-[var(--accent)] underline">
            The Tavern
          </Link>
          .
        </p>
      ) : null}

      {showAddParty ? (
        <AddPartyDialog
          onClose={() => setShowAddParty(false)}
          onSaved={(list, message) => {
            onPartiesChange(list);
            onStatus(message);
            setShowAddParty(false);
          }}
        />
      ) : null}

      {showCreateArtifact ? (
        <CreateArtifactModal
          onClose={() => setShowCreateArtifact(false)}
          onSaved={(list, item, message) => {
            onItemsChange?.(list);
            onStatus(message);
            onCategoryChange("items");
            onSelect({ kind: "item", id: item.id });
            setShowCreateArtifact(false);
          }}
        />
      ) : null}
    </div>
  );
}
