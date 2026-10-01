"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { usePathname } from "next/navigation";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { THE_LIBRARY } from "@/lib/workplace/forgeLexicon";
import VaultMiniCard from "@/features/vault/VaultMiniCard";
import ContainerDropZone from "@/features/vault/ContainerDropZone";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import type { VaultShelf } from "@/lib/vault/loadVaultEntries";
import {
  readAnyVaultDragData,
  vaultDragHasPayload,
  type VaultDragPayload,
} from "@/lib/vault/cfDragDrop";
import {
  loadVaultParkingLot,
  vaultEntryFromRow,
  type VaultParkedEntry,
  VAULT_PARKING_CHANGED_EVENT,
} from "@/lib/vault/vaultParking";
import {
  extractStaticSrdEntityId,
  reconcileVaultParkingLot,
} from "@/lib/vault/vaultSrdPark";
import {
  clearVaultExclusion,
  entryIsVaultExcluded,
  loadVaultExcludedIds,
  VAULT_EXCLUSION_CHANGED_EVENT,
} from "@/lib/vault/vaultExclusion";
import { restoreLoreVaultRows } from "@/lib/vault/loreVaultContainer";
import { onContainerRelationshipsChanged } from "@/lib/workshop/containerRelationships";
import { dropIntoVaultParking } from "@/lib/workshop/containerMoveWritePath";
import { removeFileFromVault } from "@/lib/vault/removeFileFromVault";
import type { CfRelationship } from "@/lib/workshop/containerCf";
import type { CiClass } from "@/lib/ciRegistry";
import type { VaultCardEntry } from "@/lib/vault/loadVaultEntries";

const SHELF_OPTIONS: { id: VaultShelf; label: string }[] = [
  { id: "all", label: "All" },
  { id: "heroes", label: "Heroes" },
  { id: "lore", label: "Lore" },
  { id: "rules", label: "Rules" },
  { id: "gear", label: "Gear" },
];

const PARK_ZONE_ID = "lore-vault";
const UNDO_WINDOW_MS = 8000;

type PurgeUndo = {
  id: string;
  title: string;
  rows: CfRelationship[];
};

function shelfForParked(ciClass: string): VaultCardEntry["shelf"] {
  if (ciClass === "character.sheet" || ciClass === "party.roster") return "heroes";
  if (ciClass === "npc.record" || ciClass === "location.record") return "lore";
  if (
    ciClass === "item.equipment" ||
    ciClass === "item.magic" ||
    ciClass === "item.srd-equipment" ||
    ciClass === "item.srd-magic"
  ) {
    return "gear";
  }
  return "rules";
}

function parkedToCard(row: VaultParkedEntry): VaultCardEntry {
  const ciClass = row.ciClass as CiClass;
  return {
    id: row.id,
    ciClass,
    category: "results",
    provenance: "user",
    origin: row.instanceId ? "creation" : "import",
    kindLabel: "Parked",
    title: row.title,
    detail: row.detail || "Parked in Lore Vault",
    createdAt: row.parkedAt,
    shelf: shelfForParked(row.ciClass),
    sourceSrdEntityId: row.sourceSrdEntityId ?? extractStaticSrdEntityId(row),
  };
}

export default function VaultDrawer({ layout = "overlay" }: { layout?: "overlay" | "docked" }) {
  const pathname = usePathname() ?? "/";
  const {
    open,
    toggleOpen,
    shelf,
    setShelf,
    query,
    setQuery,
    filteredEntries,
    dragging,
    dropZones,
    setDragging,
    refreshEntries,
  } = useVaultDrawer();

  const [parked, setParked] = useState<VaultParkedEntry[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [trashActive, setTrashActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [undo, setUndo] = useState<PurgeUndo | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const flashStatus = useCallback((message: string, ms = 3200) => {
    setStatusMessage(message);
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      setUndo(null);
    }, ms);
  }, []);

  useEffect(
    () => () => {
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    },
    [],
  );

  const reloadParked = useCallback(async () => {
    const [list, excluded] = await Promise.all([loadVaultParkingLot(), loadVaultExcludedIds()]);
    setExcludedIds(excluded);
    setParked(list.filter((row) => !excluded.has(row.id)));
  }, []);

  const refreshParked = useCallback(async () => {
    // Collapse orphan static-SRD stubs (e.g. magic-item:dancing-sword) into Library CFs.
    const [{ list, migrated, dropped }, excluded] = await Promise.all([
      reconcileVaultParkingLot(),
      loadVaultExcludedIds(),
    ]);
    setParked(list.filter((row) => !excluded.has(row.id)));
    setExcludedIds(excluded);
    if (migrated > 0 || dropped > 0) {
      void refreshEntries();
    }
  }, [refreshEntries]);

  useEffect(() => {
    void refreshParked();
    // Parking writes already persist; reload without re-hydrating every change.
    const onChange = () => void reloadParked();
    window.addEventListener(VAULT_PARKING_CHANGED_EVENT, onChange);
    window.addEventListener(VAULT_EXCLUSION_CHANGED_EVENT, onChange);
    // Re-parents written by campaign / sheet drop zones move rows off the vault.
    const offRelationships = onContainerRelationshipsChanged(onChange);
    return () => {
      window.removeEventListener(VAULT_PARKING_CHANGED_EVENT, onChange);
      window.removeEventListener(VAULT_EXCLUSION_CHANGED_EVENT, onChange);
      offRelationships();
    };
  }, [refreshParked, reloadParked]);

  const parkPayload = useCallback(
    async (payload: VaultDragPayload) => {
      const result = await dropIntoVaultParking(payload);
      if (!result.ok) return { ok: false, message: result.error };
      const relationship = result.relationship;
      if (relationship) {
        const entry = vaultEntryFromRow(relationship);
        setParked((prev) => (prev.some((p) => p.id === entry.id) ? prev : [entry, ...prev]));
      }
      void reloadParked();
      void refreshEntries();
      return { ok: true, message: result.message };
    },
    [reloadParked, refreshEntries],
  );

  const purge = useCallback(
    async (id: string, title: string, sourceSrdEntityId?: string | null) => {
      setParked((prev) => prev.filter((p) => p.id !== id));
      const result = await removeFileFromVault(id, true, { title, sourceSrdEntityId });
      if (!result.ok) {
        flashStatus(result.error);
        void reloadParked();
        return;
      }
      setUndo({ id, title, rows: result.removedRelationships ?? [] });
      flashStatus(result.message, UNDO_WINDOW_MS);
      void refreshEntries();
    },
    [flashStatus, reloadParked, refreshEntries],
  );

  const undoPurge = useCallback(async () => {
    if (!undo) return;
    const { id, title, rows } = undo;
    setUndo(null);
    await clearVaultExclusion(id);
    await restoreLoreVaultRows(rows);
    flashStatus(`Restored “${title}” to the Lore Vault.`);
    void reloadParked();
    void refreshEntries();
  }, [undo, flashStatus, reloadParked, refreshEntries]);

  if (pathname.startsWith("/login") || pathname.startsWith("/preview")) {
    return null;
  }

  const parkedIds = new Set(parked.map((p) => p.id));
  const parkedSrdIds = new Set(
    parked
      .map((p) => p.sourceSrdEntityId ?? extractStaticSrdEntityId(p))
      .filter((id): id is string => !!id),
  );
  // Also treat parked Library clones as covering their source SRD entity.
  for (const entry of filteredEntries) {
    if (parkedIds.has(entry.id) && entry.sourceSrdEntityId) {
      parkedSrdIds.add(entry.sourceSrdEntityId);
    }
  }
  const parkedRows = parked.filter((row) => !excludedIds.has(row.id));
  const libraryCards = filteredEntries.filter((e) => {
    if (entryIsVaultExcluded(e, excludedIds)) return false;
    if (parkedIds.has(e.id)) return false;
    if (e.sourceSrdEntityId && parkedSrdIds.has(e.sourceSrdEntityId)) return false;
    return true;
  });
  const targetZones = dropZones.filter((zone) => zone.zoneId !== PARK_ZONE_ID);

  const onTrashDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!vaultDragHasPayload(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setTrashActive(true);
  };

  const onTrashDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setTrashActive(false);
    const payload = readAnyVaultDragData(event.dataTransfer) ?? dragging;
    setDragging(null);
    if (!payload) return;
    // Any vault card can be purged (parked or library index) — no confirm step; Undo is offered.
    const row = parked.find((p) => p.id === payload.id);
    void purge(payload.id, payload.title, row?.sourceSrdEntityId ?? null);
  };

  const docked = layout === "docked";

  return (
    <>
      {docked ? null : (
        <button
          type="button"
          className={`vault-drawer-toggle ${open ? "vault-drawer-toggle--open" : ""}`}
          onClick={toggleOpen}
          aria-expanded={open}
          aria-controls="lore-vault-drawer"
        >
          <span aria-hidden="true">{APP_ICONS.chest}</span>
          Lore Vault
        </button>
      )}

      <aside
        id="lore-vault-drawer"
        className={`vault-drawer ${open || docked ? "vault-drawer--open" : ""}${docked ? " vault-drawer--docked" : ""}`}
        aria-label="Lore Vault — parking lot for Creation Files, lore, NPCs, and monsters"
      >
        <header className="vault-drawer-header">
          <div className="vault-drawer-header-text">
            <p className="vault-drawer-badge">{THE_LIBRARY}</p>
            <h2 className="vault-drawer-title font-display">Lore Vault</h2>
            <p className="vault-drawer-subtitle">
              Parking lot for CFs — drag in to stage, drag out onto Campaigns, sheets, or the table.
            </p>
          </div>
          <button
            type="button"
            className="command-center-panel-collapse"
            onClick={toggleOpen}
            aria-label={docked ? "Collapse Lore Vault" : "Close Lore Vault"}
            title={docked ? "Collapse Vault (Alt+1)" : "Close Lore Vault"}
          >
            {docked ? "‹" : "×"}
          </button>
        </header>

        <div className="vault-drawer-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your cards…"
            className="vault-drawer-search"
            aria-label="Search Lore Vault"
          />
          <div className="vault-drawer-shelves" role="tablist" aria-label="Vault shelves">
            {SHELF_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={shelf === option.id}
                className={`vault-drawer-shelf ${shelf === option.id ? "vault-drawer-shelf--active" : ""}`}
                onClick={() => setShelf(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <ContainerDropZone
          zoneId={PARK_ZONE_ID}
          label="Lore Vault"
          softAccept
          hideHeader
          compact
          className="mx-2 mb-2 flex min-h-0 flex-1 flex-col"
          panelClassName="border-transparent bg-transparent"
          onDropPayload={parkPayload}
        >
          <div className="px-1 pb-1" data-vault-park-hint>
            <p className="text-[11px] font-semibold text-slate-100">Drop here to park</p>
            <p className="text-[10px] text-slate-300">
              Stages any card in the vault. SRD entries become your own copy; Library originals stay
              in The Library.
            </p>
          </div>

          {parkedRows.length > 0 ? (
            <section className="px-1 pb-1" aria-label="Parked items">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--dmms-accent,var(--accent))]">
                Parked items ({parkedRows.length})
              </p>
              <ul className="vault-parked-grid custom-scrollbar" data-testid="vault-parked-grid">
                {parkedRows.map((row) => {
                  const entry = parkedToCard(row);
                  return (
                    <VaultMiniCard
                      key={`parked:${row.relationshipId ?? row.id}`}
                      entry={entry}
                      parked
                      relationshipId={row.relationshipId ?? null}
                      onParkedChange={() => void reloadParked()}
                      onPurge={(card) =>
                        void purge(card.id, card.title, card.sourceSrdEntityId ?? null)
                      }
                    />
                  );
                })}
              </ul>
            </section>
          ) : null}

          <ul className="vault-drawer-list custom-scrollbar">
            {libraryCards.length === 0 && parkedRows.length === 0 ? (
              <li className="vault-drawer-empty">
                No cards here yet. Drag a card from The Library or the SRD into this drawer, or
                create heroes in The Tavern.
              </li>
            ) : (
              libraryCards.map((entry) => (
                <VaultMiniCard key={`${entry.ciClass}:${entry.id}`} entry={entry} />
              ))
            )}
          </ul>
        </ContainerDropZone>

        {statusMessage ? (
          <p
            className="mx-3 mb-2 flex items-center justify-between gap-2 text-[10px] text-[var(--dmms-accent,var(--accent))]"
            role="status"
          >
            <span>{statusMessage}</span>
            {undo ? (
              <button
                type="button"
                className="shrink-0 underline underline-offset-2 hover:text-slate-100"
                onClick={() => void undoPurge()}
              >
                Undo
              </button>
            ) : null}
          </p>
        ) : null}

        {/* Trash / hard-purge drop zone — outside the park zone so a trash drop never parks. */}
        <div
          className={`mx-3 mb-3 rounded-lg border-2 border-dashed px-3 py-2 transition ${
            trashActive ? "ring-2 ring-red-500" : ""
          } ${dragging ? "opacity-100" : "opacity-60"}`}
          style={{
            borderColor: trashActive ? "#b91c1c" : "var(--border)",
            background: trashActive ? "rgba(127, 29, 29, 0.35)" : "transparent",
          }}
          onDragOver={onTrashDragOver}
          onDragLeave={() => setTrashActive(false)}
          onDrop={onTrashDrop}
          aria-label="Trash — drop to purge from Lore Vault"
          data-vault-trash
        >
          <p className="text-[11px] font-semibold text-hp">Trash</p>
          <p className="text-[10px] text-slate-300">
            Drop a vault card here to purge it from the Lore Vault. Your Library copy is kept, and
            you can undo.
          </p>
        </div>

        {dragging ? (
          <footer className="vault-drawer-footer">
            <p className="vault-drawer-footer-title">Drop zones ready</p>
            {targetZones.length === 0 ? (
              <p className="vault-drawer-footer-hint">
                Open Campaign, a Character sheet, or the Virtual Table for highlighted drop areas.
              </p>
            ) : (
              <ul className="vault-drawer-targets">
                {targetZones.map((zone) => (
                  <li key={zone.zoneId}>{zone.label}</li>
                ))}
              </ul>
            )}
          </footer>
        ) : null}
      </aside>
    </>
  );
}