/**
 * Power Workspace state machine — 3 core views for DMMS.
 *
 * Cores (primary):
 *   library   — The Vault (authoritative CF + SRD repository)
 *   campaign  — DM Control Panel (party, realm, maps, unassigned loot)
 *   character — Interactive Character repository (inventory, spells, modifiers)
 *
 * Legacy forge/tend workplaces remain reachable as secondary routes
 * (preserve-and-expand). This machine is the single source of truth for
 * which Power Workspace is active and for Create New / clone intents.
 */

export type PowerWorkspaceCore = "library" | "campaign" | "character";

export type PowerWorkspaceSecondary =
  | "hearth"
  | "forge-realm"
  | "forge-adventure"
  | "forge-maps"
  | "forge-characters"
  | "forge-props"
  | "encounters"
  | "items"
  | "table";

export type PowerWorkspaceId = PowerWorkspaceCore | PowerWorkspaceSecondary;

export type CreateNewKind =
  | "realm"
  | "npc"
  | "item"
  | "spell"
  | "character"
  | "location"
  | "quest"
  | "party"
  | "campaign";

export type PowerWorkspaceState = {
  core: PowerWorkspaceCore;
  /** Secondary workplace when user drills into forge/tend (null = core only). */
  secondary: PowerWorkspaceSecondary | null;
  /** Active campaign id for loot / party context. */
  activeCampaignId: string | null;
  /** Active character sheet id in Character workspace. */
  activeCharacterId: string | null;
  /** Create New hub open state. */
  createHubOpen: boolean;
  createHubKind: CreateNewKind | null;
  /** Prefer homebrew path in creation modals. */
  homebrewPreferred: boolean;
};

export type PowerWorkspaceEvent =
  | { type: "SELECT_CORE"; core: PowerWorkspaceCore }
  | { type: "OPEN_SECONDARY"; secondary: PowerWorkspaceSecondary }
  | { type: "CLEAR_SECONDARY" }
  | { type: "SET_ACTIVE_CAMPAIGN"; campaignId: string | null }
  | { type: "SET_ACTIVE_CHARACTER"; characterId: string | null }
  | { type: "OPEN_CREATE_HUB"; kind?: CreateNewKind; homebrew?: boolean }
  | { type: "CLOSE_CREATE_HUB" }
  | { type: "SET_HOMEBREW_PREFERRED"; value: boolean }
  | { type: "SYNC_FROM_PATH"; pathname: string };

export const POWER_WORKSPACE_CORE_META: Record<
  PowerWorkspaceCore,
  { label: string; hint: string; href: string; icon: string }
> = {
  library: {
    label: "Library",
    hint: "The Vault — all Creation Files and free official rules",
    href: "/library",
    icon: "\u{1F4DA}",
  },
  campaign: {
    label: "Campaign",
    hint: "DM Control Panel — party, world, maps, and unassigned loot",
    href: "/campaigns",
    icon: "\u{1F3C7}",
  },
  character: {
    label: "Character",
    hint: "Interactive sheet — inventory, prepared spells, and live modifiers",
    href: "/tavern",
    icon: "\u{1F9D9}",
  },
};

export function initialPowerWorkspaceState(
  partial?: Partial<PowerWorkspaceState>,
): PowerWorkspaceState {
  return {
    core: "library",
    secondary: null,
    activeCampaignId: null,
    activeCharacterId: null,
    createHubOpen: false,
    createHubKind: null,
    homebrewPreferred: true,
    ...partial,
  };
}

export function coreFromPathname(pathname: string): PowerWorkspaceCore {
  if (pathname === "/campaigns" || pathname.startsWith("/campaigns/")) return "campaign";
  if (
    pathname === "/tavern" ||
    pathname.startsWith("/tavern/") ||
    pathname === "/parties" ||
    pathname.startsWith("/parties/")
  ) {
    return "character";
  }
  return "library";
}

export function secondaryFromPathname(pathname: string): PowerWorkspaceSecondary | null {
  if (pathname.startsWith("/table")) return "table";
  if (pathname === "/encounters" || pathname.startsWith("/encounters/")) return "encounters";
  if (pathname === "/items" || pathname.startsWith("/items/")) return "items";
  if (pathname === "/" || pathname.startsWith("/?")) return "hearth";
  return null;
}

export function reducePowerWorkspace(
  state: PowerWorkspaceState,
  event: PowerWorkspaceEvent,
): PowerWorkspaceState {
  switch (event.type) {
    case "SELECT_CORE":
      return {
        ...state,
        core: event.core,
        secondary: null,
        createHubOpen: false,
        createHubKind: null,
      };
    case "OPEN_SECONDARY":
      return { ...state, secondary: event.secondary };
    case "CLEAR_SECONDARY":
      return { ...state, secondary: null };
    case "SET_ACTIVE_CAMPAIGN":
      return { ...state, activeCampaignId: event.campaignId };
    case "SET_ACTIVE_CHARACTER":
      return { ...state, activeCharacterId: event.characterId };
    case "OPEN_CREATE_HUB":
      return {
        ...state,
        createHubOpen: true,
        createHubKind: event.kind ?? null,
        homebrewPreferred: event.homebrew ?? state.homebrewPreferred,
      };
    case "CLOSE_CREATE_HUB":
      return { ...state, createHubOpen: false, createHubKind: null };
    case "SET_HOMEBREW_PREFERRED":
      return { ...state, homebrewPreferred: event.value };
    case "SYNC_FROM_PATH":
      return {
        ...state,
        core: coreFromPathname(event.pathname),
        secondary: secondaryFromPathname(event.pathname),
      };
    default:
      return state;
  }
}

export function hrefForCore(core: PowerWorkspaceCore): string {
  return POWER_WORKSPACE_CORE_META[core].href;
}
