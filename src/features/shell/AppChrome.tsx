"use client";

import type { ReactNode } from "react";
import ScryingGlassPopup from "@/features/workshop/ScryingGlassPopup";

export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ScryingGlassPopup />
    </>
  );
}
