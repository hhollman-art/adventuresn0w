import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

export const metadata: Metadata = {
  title: `${PREVIEW_WINDOW} — D&D Easy`,
  description: "Review, export, and copy generated adventures, realms, maps, and library content.",
};

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return children;
}
