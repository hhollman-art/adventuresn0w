"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import {
  filterLibraryEntries,
  LIBRARY_PROVENANCE_DESCRIPTION,
  LIBRARY_PROVENANCE_LABEL,
  LIBRARY_PROVENANCE_STORAGE,
  LIBRARY_PROVENANCE_TIERS,
  partyToLibraryEntry,
  resultToLibraryEntry,
  seedToLibraryEntry,
  sortLibraryEntries,
  WORKSHOP_LIBRARY_CATEGORY_LABEL,
  type LibraryListEntry,
  type LibraryProvenance,
  type WorkshopLibraryCategory,
} from "@/lib/workshop/libraryCatalog";
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
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import { queuePartyImport } from "@/lib/tabletop/partyCampaign";
import { filterSeeds, seedTagLabel } from "@/lib/seedTags";
import SeedFilterBar from "@/features/workshop/SeedFilterBar";
import AddPartyDialog from "@/features/workshop/AddPartyDialog";
import SrdLibraryBrowser from "@/features/workshop/SrdLibraryBrowser";
import type { SrdApiResource } from "@/lib/srd/dnd5eApi";

export type LibraryViewSelection =
  | { kind: "seed"; id: string }
  | { kind: "result"; id: string }
  | { kind: "party"; id: string }
  | { kind: "srd"; resource: SrdApiResource; index: string; name: string }
  | null;

const CATEGORY_TABS: WorkshopLibraryCategory[] = [
  "all",
  "seeds",
  "results",
  "parties",
  "srd",
];

type WorkshopLibraryPanelProps = {
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  parties: SavedCharacterRoster[];
  category: WorkshopLibraryCategory;
  selection: LibraryViewSelection;
  statusMessage: string | null;
  onCategoryChange: (category: WorkshopLibraryCategory) => void;
  onSelect: (selection: LibraryViewSelection) => void;
  onAddSeed: () => void;
  onEditSeed: (id: string) => void;
  onDeleteSeed: (id: string) => void;
  onDeleteResult: (id: string) => void;
  onDeleteParty: (id: string) => void;
  onPartiesChange: (parties: SavedCharacterRoster[]) => void;
  /** Called after a backup restore so the parent can refresh all lists. */
  onRestore: (outcome: RestoreOutcome) => void;
  onStatus: (message: string | null) => void;
  /** Fills the browse column in the wide library layout. */
  wideLayout?: boolean;
};

function ProvenanceBadge({ provenance }: { provenance: LibraryProvenance }) {
  const tone =
    provenance === "srd"
      ? { border: "var(--accent)", color: "var(--accent)", bg: "rgba(201,162,39,0.12)" }
      : provenance === "user"
        ? { border: "var(--border)", color: "var(--text)", bg: "var(--bg)" }
        : { border: "rgba(120,90,20,0.35)", color: "var(--muted)", bg: "rgba(201,162,39,0.08)" };

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

/** Plain-language "where does my data live" explainer, one card per tier. */
function DataStorageExplainer({
  syncStatus,
  onChooseFolder,
  onDisconnect,
  onExport,
  onRestoreFile,
}: {
  syncStatus: LibrarySyncStatus;
  onChooseFolder: () => void;
  onDisconnect: () => void;
  onExport: () => void;
  onRestoreFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className="rounded-lg border p-3 text-xs leading-relaxed"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <p className="text-[var(--muted)]">
        Three kinds of data live in your library. Only the included SRD rules are
        hosted by D&amp;D Easy — everything you make or import belongs to you and
        saves to <strong className="text-[var(--text)]">your auto-save folder</strong>:
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
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {syncStatus.state === "on" ? (
          <>
            <span className="font-semibold text-[var(--text)]">
              Auto-save is on — saving to “{syncStatus.folderName}”.
            </span>
            <button type="button" onClick={onChooseFolder} className="btn btn-sm">
              Change folder
            </button>
            <button type="button" onClick={onDisconnect} className="btn btn-sm">
              Turn off
            </button>
          </>
        ) : syncStatus.state === "unsupported" ? (
          <span className="text-[var(--muted)]">
            This browser can&apos;t auto-save to a folder (try Chrome or Edge), so use
            manual backups:
          </span>
        ) : (
          <button type="button" onClick={onChooseFolder} className="btn btn-sm btn-accent">
            Set auto-save folder
          </button>
        )}
        <button type="button" onClick={onExport} className="btn btn-sm">
          Export backup
        </button>
        <label className="btn btn-sm cursor-pointer">
          Restore backup
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onRestoreFile}
          />
        </label>
      </div>
      <p className="mt-2 text-[var(--muted)]">
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
  const kindMap = { seeds: "seed", results: "result", parties: "party" } as const;
  return selection.kind === kindMap[entry.category] && selection.id === entry.id;
}

function LibraryEntryRow({
  entry,
  selected,
  onView,
  onEdit,
  onDelete,
  editLabel,
}: {
  entry: LibraryListEntry;
  selected: boolean;
  onView: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  editLabel?: string;
}) {
  return (
    <li>
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
        className="library-entry-row library-entry-card rounded-lg border p-3 text-sm"
        style={{
          borderColor: selected ? "var(--accent)" : "var(--border)",
          background: selected ? "rgba(201, 162, 39, 0.1)" : undefined,
        }}
      >
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ borderColor: "var(--accent-dim)", color: "var(--accent)" }}
            >
              {entry.kindLabel}
            </span>
            <ProvenanceBadge provenance={entry.provenance} />
            <span className="font-semibold text-[var(--text)]">{entry.title}</span>
          </span>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            {WORKSHOP_LIBRARY_CATEGORY_LABEL[entry.category]} ·{" "}
            {new Date(entry.createdAt).toLocaleString()}
          </span>
          {entry.detail ? (
            <span className="mt-1 block text-xs text-[var(--muted)] line-clamp-2">{entry.detail}</span>
          ) : null}
          {entry.tags?.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1">
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
        <div
          className="library-entry-actions shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border px-2 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
              style={{ borderColor: "var(--border)" }}
            >
              {editLabel ?? "Edit"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            style={{ borderColor: "rgba(248,113,113,0.45)" }}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

export default function WorkshopLibraryPanel({
  seeds,
  results,
  parties,
  category,
  selection,
  statusMessage,
  onCategoryChange,
  onSelect,
  onAddSeed,
  onEditSeed,
  onDeleteSeed,
  onDeleteResult,
  onDeleteParty,
  onPartiesChange,
  onRestore,
  onStatus,
  wideLayout = false,
}: WorkshopLibraryPanelProps) {
  const [showStorageInfo, setShowStorageInfo] = useState(false);
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

  const filteredSeeds = useMemo(
    () =>
      filterSeeds(seeds, {
        kindFilter: seedKindFilter,
        tagFilter: seedTagFilter,
        scopeFilter: seedScopeFilter,
      }),
    [seeds, seedKindFilter, seedTagFilter, seedScopeFilter],
  );

  const entries = useMemo(() => {
    const all = sortLibraryEntries([
      ...filteredSeeds.map(seedToLibraryEntry),
      ...results.map(resultToLibraryEntry),
      ...parties.map(partyToLibraryEntry),
    ]);
    return filterLibraryEntries(all, category);
  }, [filteredSeeds, results, parties, category]);

  const counts = useMemo(
    () => ({
      seeds: seeds.length,
      results: results.length,
      parties: parties.length,
    }),
    [seeds, results, parties],
  );

  const onExportBackup = async () => {
    onStatus(null);
    const backup = await buildLibraryBackup();
    const total = backup.seeds.length + backup.results.length + backup.parties.length;
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
      `Backup exported (${backup.seeds.length} seeds, ${backup.results.length} results, ${backup.parties.length} parties). Save it anywhere you like — folder, cloud drive, or repository.`,
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
          ? "library-browse-panel"
          : "mt-6 flex flex-col gap-3 rounded-lg border p-4"
      }
      style={wideLayout ? undefined : { borderColor: "var(--border)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 shrink-0">
        <div className="min-w-0">
          {!wideLayout ? (
            <h2 className="font-display text-base font-bold text-[var(--text)]">Your library</h2>
          ) : null}
          <p className={`text-xs leading-relaxed text-[var(--muted)]${wideLayout ? "" : " mt-1"}`}>
            <strong className="text-[var(--text)]">Included rules (SRD)</strong> ship with the app.{" "}
            <strong className="text-[var(--text)]">Your imports</strong> and{" "}
            <strong className="text-[var(--text)]">your creations</strong> are yours —{" "}
            {syncStatus.state === "on" ? (
              <>
                auto-saving to <strong className="text-[var(--text)]">“{syncStatus.folderName}”</strong>.
              </>
            ) : syncStatus.state === "needs-permission" ? (
              <>auto-save is paused until you re-allow folder access.</>
            ) : (
              <>set an auto-save folder so every change is saved outside this browser.</>
            )}{" "}
            <button
              type="button"
              onClick={() => setShowStorageInfo((v) => !v)}
              className="font-semibold text-[var(--accent)] underline"
              aria-expanded={showStorageInfo}
            >
              {showStorageInfo ? "Hide storage details" : "Where is my data?"}
            </button>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddParty(true)}
            className="btn btn-sm"
          >
            Add party
          </button>
          {syncStatus.state === "off" ? (
            <button
              type="button"
              onClick={() => void onChooseSyncFolder()}
              className="btn btn-sm"
            >
              Set auto-save folder
            </button>
          ) : syncStatus.state === "needs-permission" ? (
            <button
              type="button"
              onClick={() => void onReconnectSync()}
              className="btn btn-sm btn-accent"
            >
              Re-enable auto-save
            </button>
          ) : null}
          <button type="button" onClick={onAddSeed} className="btn btn-sm btn-accent">
            Add seed
          </button>
        </div>
      </div>

      {showStorageInfo ? (
        <DataStorageExplainer
          syncStatus={syncStatus}
          onChooseFolder={() => void onChooseSyncFolder()}
          onDisconnect={() => void onDisconnectSync()}
          onExport={() => void onExportBackup()}
          onRestoreFile={(e) => void onRestoreBackup(e)}
        />
      ) : null}

      <div
        className={wideLayout ? "library-category-tabs" : "panel-tabs"}
        role="tablist"
        aria-label="Library categories"
      >
        {CATEGORY_TABS.map((tab) => {
          const count =
            tab === "all"
              ? counts.seeds + counts.results + counts.parties
              : tab === "srd"
                ? null
                : counts[tab];
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={category === tab}
              onClick={() => onCategoryChange(tab)}
              className={`panel-tab${category === tab ? " panel-tab-active" : ""}`}
            >
              <span className="panel-tab-label">
                {tab === "all" ? "All" : WORKSHOP_LIBRARY_CATEGORY_LABEL[tab]}
                {count != null ? ` (${count})` : ""}
              </span>
            </button>
          );
        })}
      </div>

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

      {category === "seeds" || category === "all" ? (
        <SeedFilterBar
          seeds={seeds}
          kindFilter={seedKindFilter}
          tagFilter={seedTagFilter}
          scopeFilter={seedScopeFilter}
          onKindFilterChange={setSeedKindFilter}
          onTagFilterChange={setSeedTagFilter}
          onScopeFilterChange={setSeedScopeFilter}
          showScopeFilter
          className="rounded-lg border p-2"
          style={{ borderColor: "var(--border)" }}
        />
      ) : null}

      {category === "srd" ? (
        <SrdLibraryBrowser
          wideLayout={wideLayout}
          selection={selection}
          onSelect={onSelect}
        />
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {category === "all"
            ? "Nothing saved yet. Generate from any tab, add a party, or add a seed manually."
            : `No ${WORKSHOP_LIBRARY_CATEGORY_LABEL[category].toLowerCase()} yet.`}
        </p>
      ) : (
        <ul
          className={
            wideLayout
              ? "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
              : "flex max-h-[min(44vh,360px)] flex-col gap-2 overflow-y-auto pr-1"
          }
        >
          {entries.map((entry) => {
            const selected = isSelected(selection, entry);
            const select = () => {
              if (entry.category === "seeds") onSelect({ kind: "seed", id: entry.id });
              else if (entry.category === "results") onSelect({ kind: "result", id: entry.id });
              else onSelect({ kind: "party", id: entry.id });
            };

            if (entry.category === "seeds") {
              return (
                <LibraryEntryRow
                  key={`seed-${entry.id}`}
                  entry={entry}
                  selected={selected}
                  onView={select}
                  onEdit={() => onEditSeed(entry.id)}
                  onDelete={() => onDeleteSeed(entry.id)}
                  editLabel="Edit seed"
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

            return (
              <LibraryEntryRow
                key={`party-${entry.id}`}
                entry={entry}
                selected={selected}
                onView={select}
                onDelete={() => onDeleteParty(entry.id)}
                editLabel="Manage"
                onEdit={() => {
                  window.location.href = "/parties";
                }}
              />
            );
          })}
        </ul>
      )}

      {category !== "srd" && parties.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          Load a party to the{" "}
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
          or open{" "}
          <Link href="/parties" className="font-semibold text-[var(--accent)] underline">
            Saved parties
          </Link>{" "}
          for campaign notes.
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
    </div>
  );
}
