"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import PowerWorkspaceProvider, {
  usePowerWorkspaceOptional,
} from "@/features/workshop/PowerWorkspaceProvider";
import FirstSaveVaultModal from "@/features/workshop/FirstSaveVaultModal";
import DmmsCommandPalette from "@/features/commandPalette/DmmsCommandPalette";
import CommandCenterLayout from "@/features/shell/CommandCenterLayout";
import AppToastHost from "@/features/ui/AppToastHost";
import { useCommandCenterActionsOptional } from "@/contexts/CommandCenterContext";

function CommandCenterChrome({ children }: { children: ReactNode }) {
  const power = usePowerWorkspaceOptional();
  const actions = useCommandCenterActionsOptional();

  useEffect(() => {
    if (power?.state.createHubOpen) {
      actions?.openCreateInspector();
    }
  }, [power?.state.createHubOpen, actions]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CommandCenterLayout>{children}</CommandCenterLayout>
      <FirstSaveVaultModal />
      <DmmsCommandPalette />
      <AppToastHost />
    </div>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <PowerWorkspaceProvider>
      <CommandCenterChrome>{children}</CommandCenterChrome>
    </PowerWorkspaceProvider>
  );
}
