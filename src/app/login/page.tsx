import DmLoginForm from "@/features/auth/DmLoginForm";

export default function LoginPage() {
  return (
    <main className="app-main mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-12">
      <p className="zone-badge w-fit">Dungeon Master</p>
      <h1 className="font-display text-2xl font-bold text-[var(--text)]">DM sign in</h1>
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Licensed DMs unlock campaign management, Fantasy Forge hosting, and session room codes for
        tablet players.
      </p>
      <DmLoginForm />
    </main>
  );
}
