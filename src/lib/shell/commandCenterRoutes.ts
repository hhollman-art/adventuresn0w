/** Persistent Command Center canvas routes. Data modules stay unchanged. */

export type CommandCenterSessionMode = "prep" | "live";

export const COMMAND_CENTER_SKIP_PATHS = ["/login", "/preview", "/join", "/table/player"] as const;

export const PREP_LIBRARY_HREF = "/library";
export const PREP_CAMPAIGN_HREF = "/campaigns";
export const LIVE_SESSION_HREF = "/table";

const LAST_PREP_HREF_KEY = "ddeasy-command-last-prep-href";

export const PREP_CANVAS_LINKS = [
  { href: PREP_LIBRARY_HREF, label: "Library", hint: "Search grid for every Creation File and included rule" },
  { href: PREP_CAMPAIGN_HREF, label: "Campaigns", hint: "Campaign builder — parties, links, and session prep" },
  { href: "/tavern", label: "Heroes", hint: "Character sheets and fellowships" },
  { href: "/items", label: "Items", hint: "Equipment and magic items" },
  { href: "/encounters", label: "Encounters", hint: "Stage fights before Live Session" },
  { href: "/", label: "Hearth", hint: "Welcome dashboard — all workplaces still live here" },
] as const;

export function isCommandCenterSkipPath(pathname: string): boolean {
  return COMMAND_CENTER_SKIP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function sessionModeFromPathname(pathname: string): CommandCenterSessionMode {
  if (pathname === "/table" || (pathname.startsWith("/table/") && !pathname.startsWith("/table/player"))) {
    return "live";
  }
  return "prep";
}

export function rememberPrepHref(pathname: string): void {
  if (typeof window === "undefined") return;
  if (sessionModeFromPathname(pathname) !== "prep") return;
  if (isCommandCenterSkipPath(pathname)) return;
  try {
    sessionStorage.setItem(LAST_PREP_HREF_KEY, pathname || PREP_LIBRARY_HREF);
  } catch {
    /* ignore */
  }
}

export function readLastPrepHref(): string {
  if (typeof window === "undefined") return PREP_LIBRARY_HREF;
  try {
    const stored = sessionStorage.getItem(LAST_PREP_HREF_KEY);
    if (stored && stored.startsWith("/") && sessionModeFromPathname(stored) === "prep") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return PREP_LIBRARY_HREF;
}

export function hrefForSessionMode(mode: CommandCenterSessionMode, currentPathname: string): string {
  if (mode === "live") {
    rememberPrepHref(currentPathname);
    return LIVE_SESSION_HREF;
  }
  if (sessionModeFromPathname(currentPathname) === "prep") return currentPathname;
  return readLastPrepHref();
}
