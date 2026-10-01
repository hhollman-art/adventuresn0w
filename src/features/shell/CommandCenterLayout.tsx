"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import VaultDrawer from "@/features/vault/VaultDrawer";
import ScryingInspector from "@/features/workshop/ScryingInspector";
import SiteTitleBar from "@/features/shell/SiteTitleBar";
import CommandCenterHeader from "@/features/shell/CommandCenterHeader";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { useCommandCenterLayout } from "@/contexts/CommandCenterContext";
import { isCommandCenterSkipPath } from "@/lib/shell/commandCenterRoutes";

type CommandCenterLayoutProps = {
  children: ReactNode;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/**
 * Persistent DM Command Center:
 * header (Prep / Live) · Lore Vault · center canvas (router page).
 * The center canvas takes all width right of the Vault. The Scrying Glass is a
 * portal pop-out (`ScryingInspector`) opened from the header, Alt+2, or any
 * "scry" action — it never reserves layout space.
 */
export default function CommandCenterLayout({ children }: CommandCenterLayoutProps) {
  const pathname = usePathname() ?? "/";
  const skip = isCommandCenterSkipPath(pathname);
  const { open: vaultOpen, toggleOpen: toggleVault, setOpen: setVaultOpen } = useVaultDrawer();
  const { toggleScryingGlass } = useCommandCenterLayout();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (isTypingTarget(event.target)) return;
        if (event.code === "Digit1" || event.key === "1") {
          event.preventDefault();
          toggleVault();
        }
        if (event.code === "Digit2" || event.key === "2") {
          event.preventDefault();
          toggleScryingGlass();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleVault, toggleScryingGlass]);

  if (skip) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <SiteTitleBar />
        <div className="vault-workplace-shell min-h-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="command-center-root">
      <CommandCenterHeader />
      <div className={`command-center${vaultOpen ? " command-center--vault-open" : ""}`}>
        {vaultOpen ? (
          <aside className="command-center-vault is-open" aria-label="Lore Vault">
            <VaultDrawer layout="docked" />
          </aside>
        ) : (
          <div className="command-center-vault-rail no-print">
            <button
              type="button"
              className="command-center-rail-btn"
              aria-pressed={false}
              aria-controls="lore-vault-drawer"
              title="Open Lore Vault (Alt+1)"
              onClick={() => setVaultOpen(true)}
            >
              <span className="command-center-rail-chevron" aria-hidden="true">
                ›
              </span>
              Vault
            </button>
          </div>
        )}

        <div className="command-center-main min-w-0" role="main">
          {children}
        </div>
      </div>

      <ScryingInspector />
    </div>
  );
}
