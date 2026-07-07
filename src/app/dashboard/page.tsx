import type { Metadata } from "next";
import DashboardPageClient from "@/features/auth/DashboardPageClient";

export const metadata: Metadata = {
  title: "Dashboard — D&D Easy",
  description: "Your Dungeon Master prep dashboard — campaigns, recent work, and quick creates.",
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
