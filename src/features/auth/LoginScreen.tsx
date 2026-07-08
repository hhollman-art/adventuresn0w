"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import AuthCard from "@/features/auth/AuthCard";
import DevQuickLoginPanel from "@/features/auth/DevQuickLoginPanel";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { FANTASY_FORGE, THE_HEARTH } from "@/lib/workplace/forgeLexicon";

/**
 * Standalone DMMS authentication gateway — sign in and create account.
 *
 * Session payloads include `tier` (`free` | `premium` | `admin`) and `role`
 * for future monetization gates; see {@link AuthCard} and `useAuthForm`.
 */
export default function LoginScreen() {
  const [preset, setPreset] = useState<{ email: string; password: string } | null>(null);

  return (
    <div className="login-screen-layout">
      <div className="login-screen">
        <div className="login-screen-back">
          <Link href="/" className="login-screen-back-link">
            <span aria-hidden="true">{APP_ICONS.welcome}</span>
            Back to {THE_HEARTH}
          </Link>
        </div>

        <div className="login-screen-brand" aria-hidden="true">
          <p className="login-screen-brand-badge">{FANTASY_FORGE}</p>
          <p className="login-screen-brand-title font-display">D&amp;D Easy</p>
        </div>

        <AuthCard preset={preset} />

        <p className="login-screen-footnote">
          New accounts start on the <strong>free</strong> tier. Premium hosting and advanced forge
          quotas unlock in a later phase.
        </p>
      </div>

      {process.env.NODE_ENV === "development" ? (
        <Suspense fallback={null}>
          <DevQuickLoginPanel
            onApplyCredentials={(email, password) => setPreset({ email, password })}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
