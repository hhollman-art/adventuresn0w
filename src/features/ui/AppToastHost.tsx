"use client";

import { useEffect, useState } from "react";
import { APP_TOAST_EVENT, type AppToastDetail } from "@/lib/ui/appToast";

/** Global toast host for campaign / vault / context-menu feedback. */
export default function AppToastHost() {
  const [toast, setToast] = useState<AppToastDetail | null>(null);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<AppToastDetail>).detail;
      if (!detail?.message) return;
      setToast(detail);
      window.setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener(APP_TOAST_EVENT, onToast);
    return () => window.removeEventListener(APP_TOAST_EVENT, onToast);
  }, []);

  if (!toast) return null;

  return (
    <div
      className="app-toast"
      role="status"
      data-tone={toast.tone ?? "info"}
    >
      {toast.message}
    </div>
  );
}
