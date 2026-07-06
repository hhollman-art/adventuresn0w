import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preview Window — D&D Easy",
  description: "Review, export, and copy generated adventures, realms, maps, and library content.",
};

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return children;
}
