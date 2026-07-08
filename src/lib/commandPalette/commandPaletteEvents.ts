import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { QuickCreateAction } from "@/lib/workshop/dmDashboard";

export const PENDING_LIBRARY_SELECTION_KEY = "ddeasy-pending-library-selection";
export const COMMAND_PALETTE_OPEN_EVENT = "ddeasy:command-palette-open";

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}

export function queuePendingLibrarySelection(selection: LibraryViewSelection): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_LIBRARY_SELECTION_KEY, JSON.stringify(selection));
}

export function readPendingLibrarySelection(): LibraryViewSelection | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_LIBRARY_SELECTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LibraryViewSelection;
    if (!parsed || typeof parsed !== "object" || !("kind" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingLibrarySelection(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_LIBRARY_SELECTION_KEY);
}

export function consumePendingLibrarySelection(): LibraryViewSelection | null {
  const pending = readPendingLibrarySelection();
  if (pending) clearPendingLibrarySelection();
  return pending;
}

const QUICK_CREATE_ACTIONS: QuickCreateAction[] = ["npc", "item", "location", "quest"];

export function parseQuickCreateParam(value: string | null): QuickCreateAction | null {
  if (!value) return null;
  return QUICK_CREATE_ACTIONS.includes(value as QuickCreateAction)
    ? (value as QuickCreateAction)
    : null;
}
