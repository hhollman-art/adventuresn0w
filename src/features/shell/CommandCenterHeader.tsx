"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CommandPaletteTrigger from "@/features/commandPalette/CommandPaletteTrigger";
import HearthAuthNav from "@/features/auth/HearthAuthNav";
import ThemePicker from "@/features/shell/ThemePicker";
import { useCommandCenterLayout } from "@/contexts/CommandCenterContext";
import { usePowerWorkspaceOptional } from "@/features/workshop/PowerWorkspaceProvider";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { useAppTheme } from "@/lib/themes/useAppTheme";
import {
  hrefForSessionMode,
  PREP_CANVAS_LINKS,
  rememberPrepHref,
  sessionModeFromPathname,
  type CommandCenterSessionMode,
} from "@/lib/shell/commandCenterRoutes";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";
import ScryingGlassIcon from "@/features/ui/ScryingGlassIcon";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

/** Minimalist Prep / Live header for the DM Command Center. */
export default function CommandCenterHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { themeId, setThemeId } = useAppTheme();
  const { openCreateInspector, scryingGlassOpen, setScryingGlassOpen } = useCommandCenterLayout();
  const power = usePowerWorkspaceOptional();
  const mode = sessionModeFromPathname(pathname);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rememberPrepHref(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!canvasOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!canvasRef.current?.contains(event.target as Node)) setCanvasOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [canvasOpen]);

  const setMode = (next: CommandCenterSessionMode) => {
    const href = hrefForSessionMode(next, pathname);
    if (href === pathname) return;
    if (next === "prep" && href === "/") dispatchWorkshopWelcome();
    router.push(href);
  };

  const openCreate = () => {
    power?.openCreateHub(undefined, true);
    openCreateInspector();
  };

  return (
    <header className="command-center-header no-print">
      <Link
        href="/"
        className="command-center-brand font-display"
        onClick={() => {
          if (!pathname.startsWith("/table")) dispatchWorkshopWelcome();
        }}
      >
        <span aria-hidden="true">{APP_ICONS.star}</span>
        D&amp;D EASY
      </Link>

      <div className="command-center-mode" role="group" aria-label="Session mode">
        <button
          type="button"
          className={`command-center-mode-btn${mode === "prep" ? " is-active" : ""}`}
          aria-pressed={mode === "prep"}
          onClick={() => setMode("prep")}
        >
          Prep Mode
        </button>
        <button
          type="button"
          className={`command-center-mode-btn${mode === "live" ? " is-active" : ""}`}
          aria-pressed={mode === "live"}
          onClick={() => setMode("live")}
        >
          Live Session
        </button>
      </div>

      <div className="command-center-header-search">
        <CommandPaletteTrigger />
      </div>

      <div className="command-center-header-actions">
        <div className="command-center-canvas-menu" ref={canvasRef}>
          <button
            type="button"
            className="btn btn-sm"
            aria-expanded={canvasOpen}
            aria-haspopup="listbox"
            onClick={() => setCanvasOpen((open) => !open)}
          >
            Canvas
          </button>
          {canvasOpen ? (
            <ul className="command-center-canvas-list" role="listbox" aria-label="Prep canvases">
              {PREP_CANVAS_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="command-center-canvas-item"
                    title={link.hint}
                    onClick={() => {
                      setCanvasOpen(false);
                      if (link.href === "/") dispatchWorkshopWelcome();
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-sm inline-flex items-center gap-1.5"
          aria-haspopup="dialog"
          aria-expanded={scryingGlassOpen}
          title={`Open the ${PREVIEW_WINDOW} to read the selected file (Alt+2)`}
          onClick={() => setScryingGlassOpen(true)}
        >
          <ScryingGlassIcon size={16} />
          Scry
        </button>
        <button type="button" className="btn btn-sm btn-accent" onClick={openCreate}>
          Create New…
        </button>
        <ThemePicker themeId={themeId} onThemeChange={setThemeId} />
        <HearthAuthNav />
      </div>
    </header>
  );
}
