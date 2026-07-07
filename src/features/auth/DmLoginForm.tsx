"use client";

import { useState } from "react";
import Link from "next/link";

export default function DmLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      window.location.href = "/table";
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-[var(--text)]">Username</span>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--border)" }}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-[var(--text)]">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--border)" }}
          required
        />
      </label>
      {error ? (
        <p className="rounded-md border px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-accent" disabled={loading}>
        {loading ? "Signing in…" : "Sign in as DM"}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">
        Players join with a room code — <Link href="/join" className="underline">no account needed</Link>.
      </p>
    </form>
  );
}
