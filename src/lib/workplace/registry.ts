import { CI_CLASSES, CI_REGISTRY } from "@/lib/ciRegistry";
import { LIBRARY_WORKSPACE_HINT, THE_LIBRARY, THE_TAVERN } from "./forgeLexicon";
import type { WorkplaceDefinition, WorkplaceId } from "./types";

const USER_CI_CLASSES = CI_CLASSES.filter((c) => CI_REGISTRY[c].provenance === "user");

/** SRD item Creation Files (CFs) ship with the app and appear in the Items workplace + Library items tab. */
export const SRD_ITEM_CI_CLASSES = ["item.srd-equipment", "item.srd-magic"] as const;

const SEED_AND_RESULT = USER_CI_CLASSES.filter(
  (c) => CI_REGISTRY[c].category === "seeds" || CI_REGISTRY[c].category === "results",
);

export const WORKPLACES: Record<WorkplaceId, WorkplaceDefinition> = {
  welcome: {
    id: "welcome",
    label: "Welcome",
    route: "/",
    description: "The Fantasy Forge hearth — pick a workspace to create something new for your table.",
    ciClasses: [],
    libraryCategory: null,
    ciCategories: [],
  },
  realm: {
    id: "realm",
    label: "Realm",
    route: "/",
    description: "Forge worlds, regions, and settlements — saves as realm Creation Files (CFs) and scrolls.",
    ciClasses: ["seed.realm", "result.realm"],
    libraryCategory: null,
    ciCategories: ["seeds", "results"],
  },
  adventure: {
    id: "adventure",
    label: "Adventure",
    route: "/",
    description: "Weave a ready-to-run quest — saves as adventure Creation Files (CFs) and scrolls.",
    ciClasses: ["seed.adventure", "result.adventure"],
    libraryCategory: null,
    ciCategories: ["seeds", "results"],
  },
  maps: {
    id: "maps",
    label: "Maps",
    route: "/",
    description: "Chart travel and battle maps — saves as map Creation Files (CFs), scrolls, and images.",
    ciClasses: ["seed.maps", "result.maps"],
    libraryCategory: null,
    ciCategories: ["seeds", "results"],
  },
  tavern: {
    id: "tavern",
    label: THE_TAVERN,
    route: "/tavern",
    description:
      "Forge heroes with AI, keep every sheet, assemble fellowships, and load them at the Virtual Table.",
    ciClasses: [
      "seed.characters",
      "result.characters",
      "character.sheet",
      "party.roster",
    ],
    libraryCategory: null,
    ciCategories: ["seeds", "results", "characters", "parties"],
  },
  props: {
    id: "props",
    label: "Item handouts",
    route: "/",
    description: "Craft printable item art — handout scrolls and images.",
    ciClasses: ["seed.props", "result.props"],
    libraryCategory: null,
    ciCategories: ["seeds", "results"],
  },
  library: {
    id: "library",
    label: THE_LIBRARY,
    route: "/library",
    description: LIBRARY_WORKSPACE_HINT,
    ciClasses: [...USER_CI_CLASSES, ...SRD_ITEM_CI_CLASSES],
    libraryCategory: null,
    ciCategories: [
      "seeds",
      "results",
      "characters",
      "items",
      "parties",
      "campaigns",
      "rules",
    ],
  },
  campaigns: {
    id: "campaigns",
    label: "Campaign",
    route: "/campaigns",
    description:
      "Campaign workspace — open a chronicle and link party, adventures, heroes, and items by id.",
    ciClasses: ["campaign.record"],
    libraryCategory: "campaigns",
    ciCategories: ["campaigns"],
  },
  items: {
    id: "items",
    label: "Items",
    route: "/items",
    description:
      "Item and equipment workspace — craft gear and magic items, import your own, and search the included SRD catalogue.",
    ciClasses: [
      "item.equipment",
      "item.magic",
      "item.srd-equipment",
      "item.srd-magic",
    ],
    libraryCategory: "items",
    ciCategories: ["items"],
  },
};

export function workplace(id: WorkplaceId): WorkplaceDefinition {
  return WORKPLACES[id];
}

export function workplaceForRoute(pathname: string): WorkplaceDefinition | null {
  if (pathname.startsWith("/table")) return null;
  if (pathname === "/library" || pathname.startsWith("/library/")) return WORKPLACES.library;
  if (pathname === "/campaigns" || pathname.startsWith("/campaigns/")) return WORKPLACES.campaigns;
  if (pathname === "/items" || pathname.startsWith("/items/")) return WORKPLACES.items;
  if (
    pathname === "/tavern" ||
    pathname.startsWith("/tavern/") ||
    pathname === "/parties" ||
    pathname.startsWith("/parties/")
  ) {
    return WORKPLACES.tavern;
  }
  if (pathname === "/" || pathname.startsWith("/?")) return WORKPLACES.welcome;
  return null;
}
