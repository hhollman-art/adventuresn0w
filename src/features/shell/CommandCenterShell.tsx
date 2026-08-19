"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import VaultDrawer from "@/features/vault/VaultDrawer";
import ScryingGlassPopup from "@/features/workshop/ScryingGlassPopup";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { useCommandCenterLayout } from "@/contexts/CommandCenterContext";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

type CommandCenterShellProps = {
  children: ReactNode;
};

const SKIP_PATHS = ["/login", "/preview", "/join"];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/** Desktop-first 3-panel DM command center: Lore Vault | workspace | Scrying inspector. */
export default function CommandCenterShell({ children }: CommandCenterShellProps) {
  const pathname = usePathname() ?? "/";
  const skip = SKIP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const { open: vaultOpen, toggleOpen: toggleVault, setOpen: setVaultOpen } = useVaultDrawer();
  const { inspectorOpen, toggleInspector, setInspectorOpen } = useCommandCenterLayout();

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
          toggleInspector();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleVault, toggleInspector]);

  if (skip) {
    return <div className="vault-workplace-shell">{children}</div>;
  }

  return (
    <div
      className={`command-center${vaultOpen ? " command-center--vault-open" : ""}${inspectorOpen ? " command-center--inspector-open" : ""}`}
    >
      <div className="command-center-vault-rail no-print">
        <button
          type="button"
          className="command-center-rail-btn"
          aria-pressed={vaultOpen}
          aria-controls="lore-vault-drawer"
          title="Lore Vault (Alt+1)"
          onClick={() => setVaultOpen(!vaultOpen)}
        >
          Vault
        </button>
      </div>

      <aside
        className={`command-center-vault${vaultOpen ? " is-open" : ""}`}
        aria-hidden={!vaultOpen}
      >
        <VaultDrawer layout="docked" />
      </aside>

      <div className="command-center-main min-w-0">{children}</div>

      <aside
        className={`command-center-inspector${inspectorOpen ? " is-open" : ""}`}
        aria-label={PREVIEW_WINDOW}
        aria-hidden={!inspectorOpen}
      >
        <ScryingGlassPopup />
      </aside>

      <div className="command-center-inspector-rail no-print">
        <button
          type="button"
          className="command-center-rail-btn"
          aria-pressed={inspectorOpen}
          title={`${PREVIEW_WINDOW} (Alt+2)`}
          onClick={() => setInspectorOpen(!inspectorOpen)}
        >
          Scry
        </button>
      </div>
    </div>
  );
}
