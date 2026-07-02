import type { Metadata } from "next";
import PlayerViewPage from "@/features/tabletop/PlayerViewPage";

export const metadata: Metadata = {
  title: "Player View — D&D Easy Virtual Table",
  description: "The players' window onto the Dungeon Master's virtual table.",
};

export default function Page() {
  return <PlayerViewPage />;
}
