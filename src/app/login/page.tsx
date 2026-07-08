import type { Metadata } from "next";
import LoginScreen from "@/features/auth/LoginScreen";

export const metadata: Metadata = {
  title: "Sign in — D&D Easy",
  description: "Sign in or create a free Dungeon Master account for D&D Easy.",
};

export default function LoginPage() {
  return (
    <main className="auth-page-shell mx-auto flex w-full flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <LoginScreen />
    </main>
  );
}
