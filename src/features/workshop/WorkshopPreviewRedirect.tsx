"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  openOrFocusPreviewWindow,
  readPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";

/** Legacy /preview route — opens the in-app Scrying Glass popup and returns to the forge. */
export default function WorkshopPreviewRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (readPreviewSnapshot()) {
      openOrFocusPreviewWindow();
    }
    router.replace("/");
  }, [router]);

  return (
    <main className="app-main mx-auto px-4 py-10 text-sm text-[var(--muted)]">
      Opening Scrying Glass…
    </main>
  );
}
