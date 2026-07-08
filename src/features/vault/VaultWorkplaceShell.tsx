"use client";

import type { ReactNode } from "react";
import VaultDrawer from "@/features/vault/VaultDrawer";

type VaultWorkplaceShellProps = {
  children: ReactNode;
};

/** Global layout wrapper — main workspace content plus the collapsible Lore Vault drawer. */
export default function VaultWorkplaceShell({ children }: VaultWorkplaceShellProps) {
  return (
    <div className="vault-workplace-shell">
      <div className="vault-workplace-main min-w-0 flex-1">{children}</div>
      <VaultDrawer />
    </div>
  );
}
