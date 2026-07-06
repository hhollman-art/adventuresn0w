"use client";

import type { ReactNode } from "react";

/** Pages without a left workspace nav. */
export default function StandaloneContentShell({ children }: { children: ReactNode }) {
  return (
    <div className="standalone-content-shell mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      {children}
    </div>
  );
}
