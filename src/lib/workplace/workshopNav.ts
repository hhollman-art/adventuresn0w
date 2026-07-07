import type { WorkplaceId } from "./types";
import { THE_HEARTH, THE_LIBRARY, THE_TAVERN } from "./forgeLexicon";
import { dmTip } from "@/lib/ui/dmTips";

/** Creation generators on the Fantasy Forge home route (`/`). */
export type WorkshopCreationId = "realm" | "adventure" | "maps" | "characters" | "props";

export type WorkshopNavId = "welcome" | WorkshopCreationId | WorkplaceId;

export type WorkshopNavGroup = "hearth" | "campaign" | "forge" | "tend" | "library";

export type WorkshopNavItem = {
  id: WorkshopNavId;
  label: string;
  hint: string;
  /** Optional advanced guidance for rich tooltips. */
  dmTip?: string;
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
    label: THE_HEARTH,
    hint: "Start at the hearth",
    dmTip: dmTip("welcome"),
    icon: "\u{1F3E0}",
    group: "hearth",
  },
  {
    id: "library",
    label: THE_LIBRARY,
    hint: "AI outputs & homebrew CFs — search and manage everything you save",
    dmTip: dmTip("library"),
    icon: "\u{1F4DA}",
    group: "library",
    href: "/library",
  },
  {
    id: "campaigns",
    label: "Campaign",
    hint: "Bundle homebrew party, adventures, maps, heroes, and loot",
    dmTip: dmTip("campaigns"),
    icon: "\u{1F3C7}",
    group: "campaign",
    href: "/campaigns",
  },
  {
    id: "realm",
    label: "Realm",
    hint: "AI worlds or hand-write homebrew realms & towns",
    dmTip: dmTip("realm"),
    icon: "\u{1F3F0}",
    group: "forge",
    creation: "realm",
  },
  {
    id: "adventure",
    label: "Adventure",
    hint: "AI quests or craft homebrew adventures",
    dmTip: dmTip("adventure"),
    icon: "\u2694\uFE0F",
    group: "forge",
    creation: "adventure",
  },
  {
    id: "maps",
    label: "Maps",
    hint: "AI travel & battle charts or maps from your lore CFs",
    dmTip: dmTip("maps"),
    icon: "\u{1F5FA}\uFE0F",
    group: "forge",
    creation: "maps",
  },
  {
    id: "tavern",
    label: THE_TAVERN,
    hint: "AI hero parties or homebrew character & party CFs",
    dmTip: dmTip("tavern"),
    icon: "\u{1F37A}",
    group: "tend",
    href: "/tavern",
  },
  {
    id: "items",
    label: "Items",
    hint: "AI handouts or craft homebrew equipment & magic items",
    dmTip: dmTip("items"),
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
  if (
    options.pathname === "/tavern" ||
    options.pathname.startsWith("/tavern/") ||
    options.pathname === "/parties" ||
    options.pathname.startsWith("/parties/")
  ) {
    return "tavern";
  }
  if (options.pathname === "/items" || options.pathname.startsWith("/items/")) {
    return "items";
  }
  if (options.pathname === "/" || options.pathname.startsWith("/?")) {
    if (options.workspace === "characters") return "tavern";
    return options.workspace;
  }
  return null;
}
