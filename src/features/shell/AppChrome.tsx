"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import PowerWorkspaceProvider, {
  usePowerWorkspaceOptional,
} from "@/features/workshop/PowerWorkspaceProvider";
import PowerWorkspaceSwitcher from "@/features/workshop/PowerWorkspaceSwitcher";
import CreateNewHubDialog from "@/features/workshop/CreateNewHubDialog";
import FirstSaveVaultModal from "@/features/workshop/FirstSaveVaultModal";
import DmmsCommandPalette from "@/features/commandPalette/DmmsCommandPalette";
import CommandCenterShell from "@/features/shell/CommandCenterShell";
import AppToastHost from "@/features/ui/AppToastHost";

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
    <div className="flex min-h-0 flex-1 flex-col">
      <PowerWorkspaceSwitcher onCreateNew={openHub} />
      <CommandCenterShell>{children}</CommandCenterShell>
      <CreateNewHubDialog
        open={hubOpen}
        initialKind={power?.state.createHubKind}
        homebrewPreferred={power?.state.homebrewPreferred ?? true}
        onClose={closeHub}
      />
      <FirstSaveVaultModal />
      <DmmsCommandPalette />
      <AppToastHost />
    </div>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <PowerWorkspaceProvider>
      <PowerWorkspaceChrome>{children}</PowerWorkspaceChrome>
    </PowerWorkspaceProvider>
  );
}
