"use client";

import { usePathname } from "next/navigation";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { THE_LIBRARY } from "@/lib/workplace/forgeLexicon";
import VaultMiniCard from "@/features/vault/VaultMiniCard";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import type { VaultShelf } from "@/lib/vault/loadVaultEntries";

const SHELF_OPTIONS: { id: VaultShelf; label: string }[] = [
  { id: "all", label: "All" },
  { id: "heroes", label: "Heroes" },
  { id: "lore", label: "Lore" },
  { id: "rules", label: "Rules" },
  { id: "gear", label: "Gear" },
];

export default function VaultDrawer() {
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
  } = useVaultDrawer();

  if (pathname.startsWith("/login") || pathname.startsWith("/preview")) {
    return null;
  }

  return (
    <>
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

      <aside
        id="lore-vault-drawer"
        className={`vault-drawer ${open ? "vault-drawer--open" : ""}`}
        aria-label="Lore Vault — draggable Creation Files"
      >
        <header className="vault-drawer-header">
          <div>
            <p className="vault-drawer-badge">{THE_LIBRARY}</p>
            <h2 className="vault-drawer-title font-display">Lore Vault</h2>
            <p className="vault-drawer-subtitle">
              Drag cards onto a workspace like chess pieces — heroes onto the map, NPCs into play.
            </p>
          </div>
          <button type="button" className="vault-drawer-close" onClick={toggleOpen} aria-label="Close Lore Vault">
            ×
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

        <ul className="vault-drawer-list">
          {filteredEntries.length === 0 ? (
            <li className="vault-drawer-empty">
              No cards here yet. Clone rules from {THE_LIBRARY} or create heroes in The Tavern.
            </li>
          ) : (
            filteredEntries.map((entry) => <VaultMiniCard key={`${entry.ciClass}:${entry.id}`} entry={entry} />)
          )}
        </ul>

        {dragging ? (
          <footer className="vault-drawer-footer">
            <p className="vault-drawer-footer-title">Drop zones ready</p>
            {dropZones.length === 0 ? (
              <p className="vault-drawer-footer-hint">
                Open the Virtual Table to deploy tokens, or use a workspace with a highlighted drop area.
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
    </>
  );
}
