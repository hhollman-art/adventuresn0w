import type { CiClass, CiCategory } from "@/lib/ciRegistry";
import type { LibraryStorageCategory } from "@/lib/workshop/libraryCatalog";

/**
 * A workplace is the UI surface for one slice of the CMDB — it owns browse,
 * create, and edit interfaces for its CI classes. The Library aggregates all
 * workplaces; dedicated routes (e.g. /items, /tavern) are the same CI types
 * with workplace-specific tooling.
 */
export type WorkplaceId =
  | "welcome"
  | "realm"
  | "adventure"
  | "maps"
  | "props"
  | "library"
  | "campaigns"
  | "tavern"
  | "items";

export type WorkplaceDefinition = {
  id: WorkplaceId;
  label: string;
  route: string;
  /** Human description for help and empty states. */
  description: string;
  /** CI classes this workplace exposes in its UI. */
  ciClasses: CiClass[];
  /** Matching Library tab, when this workplace maps to one category. */
  libraryCategory: LibraryStorageCategory | null;
  /** CMDB categories represented (for cross-workplace queries). */
  ciCategories: CiCategory[];
};
