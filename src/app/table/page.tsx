import type { Metadata } from "next";
import TabletopPage from "@/features/tabletop/TabletopPage";

export const metadata: Metadata = {
  title: "Virtual Table — D&D Easy",
  description:
    "Run encounters live: battle maps, tokens, fog of war, initiative, and dice — synced to a player view.",
};

export default function Page() {
  return <TabletopPage />;
}
