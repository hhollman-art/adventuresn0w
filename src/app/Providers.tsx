"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAnnouncementProvider } from "@/contexts/AdminAnnouncementContext";
import { VaultDrawerProvider } from "@/contexts/VaultDrawerContext";
import { CommandCenterProvider } from "@/contexts/CommandCenterContext";
import { WorkspaceContextRouterProvider } from "@/contexts/WorkspaceContextRouter";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminAnnouncementProvider>
        <WorkspaceContextRouterProvider>
          <VaultDrawerProvider>
            <CommandCenterProvider>
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </CommandCenterProvider>
          </VaultDrawerProvider>
        </WorkspaceContextRouterProvider>
      </AdminAnnouncementProvider>
    </AuthProvider>
  );
}
