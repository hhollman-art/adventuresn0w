"use client";

import type { ReactNode } from "react";
import ScryingGlassPopup from "@/features/workshop/ScryingGlassPopup";
import DmmsCommandPalette from "@/features/commandPalette/DmmsCommandPalette";
import VaultWorkplaceShell from "@/features/vault/VaultWorkplaceShell";

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <VaultWorkplaceShell>{children}</VaultWorkplaceShell>
      <ScryingGlassPopup />
      <DmmsCommandPalette />
    </>
  );
}
