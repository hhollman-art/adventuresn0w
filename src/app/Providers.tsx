"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAnnouncementProvider } from "@/contexts/AdminAnnouncementContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminAnnouncementProvider>{children}</AdminAnnouncementProvider>
    </AuthProvider>
  );
}
