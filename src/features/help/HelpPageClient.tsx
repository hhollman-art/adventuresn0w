"use client";

import type { ReactNode } from "react";
import WorkshopPageShell from "@/features/workshop/WorkshopPageShell";

export default function HelpPageClient({ children }: { children: ReactNode }) {
  return <WorkshopPageShell>{children}</WorkshopPageShell>;
}
