"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import PowerWorkspaceProvider, {
  usePowerWorkspaceOptional,
} from "@/features/workshop/PowerWorkspaceProvider";
import PowerWorkspaceSwitcher from "@/features/workshop/PowerWorkspaceSwitcher";
import CreateNewHubDialog from "@/features/workshop/CreateNewHubDialog";
import FirstSaveVaultModal from "@/features/workshop/FirstSaveVaultModal";
import ScryingGlassPopup from "@/features/workshop/ScryingGlassPopup";
import DmmsCommandPalette from "@/features/commandPalette/DmmsCommandPalette";
import VaultWorkplaceShell from "@/features/vault/VaultWorkplaceShell";

function PowerWorkspaceChrome({ children }: { children: ReactNode }) {
  const power = usePowerWorkspaceOptional();
  const [localHubOpen, setLocalHubOpen] = useState(false);
  const hubOpen = power?.state.createHubOpen ?? localHubOpen;

  const openHub = useCallback(() => {
    if (power) power.openCreateHub(undefined, true);
    else setLocalHubOpen(true);
  }, [power]);

  const closeHub = useCallback(() => {
    if (power) power.closeCreateHub();
    else setLocalHubOpen(false);
  }, [power]);

  return (
    <>
      <PowerWorkspaceSwitcher onCreateNew={openHub} />
      <VaultWorkplaceShell>{children}</VaultWorkplaceShell>
      <CreateNewHubDialog
        open={hubOpen}
        initialKind={power?.state.createHubKind}
        homebrewPreferred={power?.state.homebrewPreferred ?? true}
        onClose={closeHub}
      />
      <FirstSaveVaultModal />
      <ScryingGlassPopup />
      <DmmsCommandPalette />
    </>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <PowerWorkspaceProvider>
      <PowerWorkspaceChrome>{children}</PowerWorkspaceChrome>
    </PowerWorkspaceProvider>
  );
}
