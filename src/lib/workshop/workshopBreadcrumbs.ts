import { THE_HEARTH } from "@/lib/workplace/forgeLexicon";
import type { WorkshopLibraryCategory } from "@/lib/workshop/libraryCatalog";
import { LIBRARY_SHELF_LABEL } from "@/lib/workshop/libraryBrowseFilters";
import { MODE_TAB_LABEL, type CreationMode } from "@/features/home/homeTypes";
import {
  WORKSHOP_NAV_ITEMS,
  type WorkshopCreationId,
  type WorkshopNavId,
} from "@/lib/workplace/workshopNav";

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export function buildWorkshopBreadcrumbs(options: {
  pathname: string;
  workspace: "welcome" | WorkshopCreationId;
  libraryCategory?: WorkshopLibraryCategory;
}): BreadcrumbSegment[] {
  const { pathname, workspace, libraryCategory } = options;

  if (pathname === "/" && workspace === "welcome") {
    return [{ label: THE_HEARTH }];
  }

  const trail: BreadcrumbSegment[] = [{ label: THE_HEARTH, href: "/" }];

  if (pathname === "/library" || pathname.startsWith("/library/")) {
    trail.push({ label: "Library", href: "/library" });
    if (libraryCategory && libraryCategory !== "all") {
      trail.push({ label: LIBRARY_SHELF_LABEL[libraryCategory] });
    }
    return trail;
  }

  if (pathname === "/campaigns" || pathname.startsWith("/campaigns/")) {
    trail.push({ label: "Campaigns" });
    return trail;
  }

  if (
    pathname === "/tavern" ||
    pathname.startsWith("/tavern/") ||
    pathname === "/parties" ||
    pathname.startsWith("/parties/")
  ) {
    trail.push({ label: "Tavern" });
    return trail;
  }

  if (pathname === "/items" || pathname.startsWith("/items/")) {
    trail.push({ label: "Items" });
    return trail;
  }

  if (pathname.startsWith("/table")) {
    trail.push({ label: "Virtual Table" });
    return trail;
  }

  if (pathname === "/help" || pathname.startsWith("/help")) {
    trail.push({ label: "Help" });
    return trail;
  }

  if (workspace === "welcome") {
    return trail;
  }

  const creationLabel = MODE_TAB_LABEL[workspace as CreationMode];
  if (creationLabel) {
    trail.push({ label: creationLabel });
  }

  return trail;
}

export function breadcrumbNavId(pathname: string, workspace: "welcome" | WorkshopCreationId): WorkshopNavId | null {
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/campaigns")) return "campaigns";
  if (pathname.startsWith("/tavern") || pathname.startsWith("/parties")) return "tavern";
  if (pathname.startsWith("/items")) return "items";
  if (pathname === "/" && workspace !== "welcome") return workspace;
  if (workspace === "welcome") return "welcome";
  return null;
}

export function breadcrumbNavLabel(id: WorkshopNavId | null): string | undefined {
  if (!id) return undefined;
  return WORKSHOP_NAV_ITEMS.find((item) => item.id === id)?.label;
}
