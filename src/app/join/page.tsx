import { Suspense } from "react";
import PlayerJoinPage from "@/features/session-room/PlayerJoinPage";

export default function JoinRoutePage() {
  return (
    <Suspense fallback={<main className="app-main px-4 py-12 text-center text-sm text-[var(--muted)]">Loading…</main>}>
      <PlayerJoinPage />
    </Suspense>
  );
}
