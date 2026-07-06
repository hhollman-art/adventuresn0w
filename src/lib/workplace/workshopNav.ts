import type { WorkplaceId } from "./types";
import { THE_LIBRARY } from "./forgeLexicon";

/** Creation generators on the Fantasy Forge home route (`/`). */
export type WorkshopCreationId = "realm" | "adventure" | "maps" | "characters" | "props";

export type WorkshopNavId = "welcome" | WorkshopCreationId | WorkplaceId;

export type WorkshopNavGroup = "hearth" | "campaign" | "forge" | "tend" | "library";

export type WorkshopNavItem = {
  id: WorkshopNavId;
  label: string;
  hint: string;
  icon: string;
  group: WorkshopNavGroup;
  href?: string;
  creation?: WorkshopCreationId;
};

export const WORKSHOP_NAV_GROUP_LABEL: Record<WorkshopNavGroup, string> = {
  hearth: "Hearth",
  campaign: "Campaign",
  forge: "Creation",
  tend: "Your prep",
  library: THE_LIBRARY,
};

export const WORKSHOP_NAV_ITEMS: WorkshopNavItem[] = [
  {
    id: "welcome",
    label: "Welcome",
    hint: "Start at the hearth",
    icon: "\u{1F3E0}",
    group: "hearth",
  },
  {
    id: "library",
    label: THE_LIBRARY,
    hint: "Heart of your prep — search & manage every saved creation",
    icon: "\u{1F4DA}",
    group: "library",
    href: "/library",
  },
  {
    id: "campaigns",
    label: "Campaign",
    hint: "Chronicles — link party, adventures, and loot",
    icon: "\u{1F3F0}",
    group: "campaign",
    href: "/campaigns",
  },
  {
    id: "realm",
    label: "Realm",
    hint: "Worlds & towns — AI, write, or import",
    icon: "\u{1F3F0}",
    group: "forge",
    creation: "realm",
  },
  {
    id: "adventure",
    label: "Adventure",
    hint: "Quests — AI, write, or import",
    icon: "\u2694\uFE0F",
    group: "forge",
    creation: "adventure",
  },
  {
    id: "maps",
    label: "Maps",
    hint: "Travel & battle charts — AI or lore seeds",
    icon: "\u{1F5FA}\uFE0F",
    group: "forge",
    creation: "maps",
  },
  {
    id: "characters",
    label: "Heroes",
    hint: "Ready-made heroes — AI or import .md",
    icon: "\u{1F9D9}",
    group: "forge",
    creation: "characters",
  },
  {
    id: "parties",
    label: "Fellowships",
    hint: "Hero sheets & party rosters",
    icon: "\u{1F465}",
    group: "tend",
    href: "/parties",
  },
  {
    id: "items",
    label: "Items",
    hint: "Equipment & magic — craft or import",
    icon: "\u{1F48E}",
    group: "tend",
    href: "/items",
  },
];

export const WORKSHOP_NAV_GROUPS: WorkshopNavGroup[] = [
  "hearth",
  "library",
  "campaign",
  "forge",
  "tend",
];

export function workshopNavItem(id: WorkshopNavId): WorkshopNavItem | undefined {
  return WORKSHOP_NAV_ITEMS.find((item) => item.id === id);
}

export function activeWorkshopNavId(options: {
  pathname: string;
  workspace: "welcome" | WorkshopCreationId;
}): WorkshopNavId | null {
  if (options.pathname.startsWith("/table")) {
    return null;
  }
  if (options.pathname === "/library" || options.pathname.startsWith("/library/")) {
    return "library";
  }
  if (options.pathname === "/campaigns" || options.pathname.startsWith("/campaigns/")) {
    return "campaigns";
  }
  if (options.pathname === "/parties" || options.pathname.startsWith("/parties/")) {
    return "parties";
  }
  if (options.pathname === "/items" || options.pathname.startsWith("/items/")) {
    return "items";
  }
  if (options.pathname === "/" || options.pathname.startsWith("/?")) {
    return options.workspace;
  }
  return null;
}
