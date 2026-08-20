"use client";

import { useCallback, useEffect, useState, type DragEvent } from "react";
import { usePathname } from "next/navigation";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { THE_LIBRARY } from "@/lib/workplace/forgeLexicon";
import VaultMiniCard from "@/features/vault/VaultMiniCard";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import type { VaultShelf } from "@/lib/vault/loadVaultEntries";
import {
  readAnyVaultDragData,
  vaultDragHasPayload,
} from "@/lib/vault/cfDragDrop";
import {
  loadVaultParkingLot,
  type VaultParkedEntry,
  VAULT_PARKING_CHANGED_EVENT,
} from "@/lib/vault/vaultParking";
import {
  extractStaticSrdEntityId,
  reconcileVaultParkingLot,
} from "@/lib/vault/vaultSrdPark";
import {
  entryIsVaultExcluded,
  loadVaultExcludedIds,
  VAULT_EXCLUSION_CHANGED_EVENT,
} from "@/lib/vault/vaultExclusion";
import { dropIntoVaultParking } from "@/lib/workshop/containerMoveWritePath";
import { emitAppToast } from "@/lib/ui/appToast";
import {
  removeFileFromVault,
} from "@/lib/vault/removeFileFromVault";
import type { CiClass } from "@/lib/ciRegistry";
import type { VaultCardEntry } from "@/lib/vault/loadVaultEntries";

const SHELF_OPTIONS: { id: VaultShelf; label: string }[] = [
  { id: "all", label: "All" },
  { id: "heroes", label: "Heroes" },
  { id: "lore", label: "Lore" },
  { id: "rules", label: "Rules" },
  { id: "gear", label: "Gear" },
];

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
    origin: "import",
    kindLabel: "Parked",
    title: row.title,
    detail: row.detail || "Parked in Lore Vault",
    createdAt: row.parkedAt,
    shelf: shelfForParked(row.ciClass),
    sourceSrdEntityId: extractStaticSrdEntityId(row),
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
  const [parkActive, setParkActive] = useState(false);
  const [trashActive, setTrashActive] = useState(false);
  const [parkMessage, setParkMessage] = useState<string | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);

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
    const onChange = () => {
      // Parking writes already persist; reload without re-hydrating every keystroke.
      void Promise.all([loadVaultParkingLot(), loadVaultExcludedIds()]).then(
        ([list, excluded]) => {
          setExcludedIds(excluded);
          setParked(list.filter((row) => !excluded.has(row.id)));
        },
      );
    };
    window.addEventListener(VAULT_PARKING_CHANGED_EVENT, onChange);
    window.addEventListener(VAULT_EXCLUSION_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(VAULT_PARKING_CHANGED_EVENT, onChange);
      window.removeEventListener(VAULT_EXCLUSION_CHANGED_EVENT, onChange);
    };
  }, [refreshParked]);

  if (pathname.startsWith("/login") || pathname.startsWith("/preview")) {
    return null;
  }

  const parkedIds = new Set(parked.map((p) => p.id));
  const parkedSrdIds = new Set(
    parked
      .map((p) => extractStaticSrdEntityId(p))
      .filter((id): id is string => !!id),
  );
  // Also treat parked Library clones as covering their source SRD entity.
  for (const entry of filteredEntries) {
    if (parkedIds.has(entry.id) && entry.sourceSrdEntityId) {
      parkedSrdIds.add(entry.sourceSrdEntityId);
    }
  }
  const parkedCards = parked
    .filter((row) => !excludedIds.has(row.id))
    .map(parkedToCard);
  const libraryCards = filteredEntries.filter((e) => {
    if (entryIsVaultExcluded(e, excludedIds)) return false;
    if (parkedIds.has(e.id)) return false;
    if (e.sourceSrdEntityId && parkedSrdIds.has(e.sourceSrdEntityId)) return false;
    return true;
  });

  const onParkDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!vaultDragHasPayload(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setParkActive(true);
  };

  const onParkDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setParkActive(false);
    const payload = readAnyVaultDragData(event.dataTransfer);
    setDragging(null);
    if (!payload) return;
    const result = await dropIntoVaultParking(payload);
    setParkMessage(result.ok ? result.message : result.error);
    emitAppToast(result.ok ? result.message : result.error ?? "", result.ok ? "success" : "warn");
    if (result.ok) {
      void refreshParked();
      void refreshEntries();
    }
    window.setTimeout(() => setParkMessage(null), 3200);
  };

  const onTrashDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!vaultDragHasPayload(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setTrashActive(true);
  };

  const onTrashDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setTrashActive(false);
    const payload = readAnyVaultDragData(event.dataTransfer);
    setDragging(null);
    if (!payload) return;
    // Any vault card can be purged (parked or library index).
    setPurgeConfirm({ id: payload.id, title: payload.title });
  };

  const runHardPurge = async () => {
    if (!purgeConfirm) return;
    const { id, title } = purgeConfirm;
    setPurgeConfirm(null);
    const result = await removeFileFromVault(id, true, { title });
    setParkMessage(result.ok ? result.message : result.error);
    void refreshParked();
    void refreshEntries();
    window.setTimeout(() => setParkMessage(null), 3200);
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

        <div
          className={`mx-3 mb-2 rounded-lg border-2 border-dashed px-3 py-2 transition ${
            parkActive ? "ring-2 ring-[var(--accent)]" : ""
          }`}
          style={{
            borderColor: parkActive ? "var(--dmms-accent, var(--accent))" : "var(--border)",
            background: parkActive ? "var(--accent-muted)" : "transparent",
          }}
          onDragOver={onParkDragOver}
          onDragLeave={() => setParkActive(false)}
          onDrop={(e) => void onParkDrop(e)}
        >
          <p className="text-[11px] font-semibold text-slate-100">Drop here to park</p>
          <p className="text-[10px] text-slate-300">
            Stages a CF in the vault lot without removing it from The Library.
          </p>
          {parkMessage ? (
            <p className="mt-1 text-[10px] text-[var(--dmms-accent,var(--accent))]" role="status">
              {parkMessage}
            </p>
          ) : null}
        </div>

        {parkedCards.length > 0 ? (
          <div className="px-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--dmms-accent,var(--accent))]">
              Parked ({parkedCards.length})
            </p>
            <ul className="vault-drawer-list custom-scrollbar mt-1">
              {parkedCards.map((entry) => (
                <VaultMiniCard
                  key={`parked:${entry.ciClass}:${entry.id}`}
                  entry={entry}
                  parked
                  onParkedChange={() => void refreshParked()}
                />
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="vault-drawer-list custom-scrollbar">
          {libraryCards.length === 0 && parkedCards.length === 0 ? (
            <li className="vault-drawer-empty">
              No cards here yet. Drop a CF into the park zone, or create heroes in The Tavern.
            </li>
          ) : (
            libraryCards.map((entry) => (
              <VaultMiniCard key={`${entry.ciClass}:${entry.id}`} entry={entry} />
            ))
          )}
        </ul>

        {/* Trash / hard-purge drop zone — only armed while dragging */}
        <div
          className={`mx-3 mb-3 mt-auto rounded-lg border-2 border-dashed px-3 py-2 transition ${
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
        >
          <p className="text-[11px] font-semibold text-hp">Trash</p>
          <p className="text-[10px] text-slate-300">
            Drop a vault card here to remove it from the Lore Vault (confirmation required).
          </p>
        </div>

        {dragging ? (
          <footer className="vault-drawer-footer">
            <p className="vault-drawer-footer-title">Drop zones ready</p>
            {dropZones.length === 0 ? (
              <p className="vault-drawer-footer-hint">
                Open Campaign, a Character sheet, or the Virtual Table for highlighted drop areas.
              </p>
            ) : (
              <ul className="vault-drawer-targets">
                {dropZones.map((zone) => (
                  <li key={zone.zoneId}>{zone.label}</li>
                ))}
              </ul>
            )}
          </footer>
        ) : null}
      </aside>

      {purgeConfirm ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vault-trash-purge-title"
          onClick={() => setPurgeConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border p-4 shadow-xl"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="vault-trash-purge-title" className="text-sm font-bold text-slate-100">
              Purge from Vault?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Remove <span className="text-slate-100">{purgeConfirm.title}</span> from the Lore
              Vault? It will no longer appear here. The Library original (if any) is not deleted —
              drop it into “Park” again if you want it back.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-sm" onClick={() => setPurgeConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: "var(--dmms-hp, #f85149)",
                  color: "var(--dmms-text, #f0f6fc)",
                  borderColor: "var(--dmms-hp, #f85149)",
                }}
                onClick={() => void runHardPurge()}
              >
                Purge from Vault
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
