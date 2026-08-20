"use client";

import CommandCenterLayout from "@/features/shell/CommandCenterLayout";
import type { ReactNode } from "react";

/** @deprecated Use CommandCenterLayout — kept as a stable import alias. */
export default function CommandCenterShell({ children }: { children: ReactNode }) {
  return <CommandCenterLayout>{children}</CommandCenterLayout>;
}
