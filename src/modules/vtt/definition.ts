import type { CiClass } from "@/lib/ciRegistry";
import { VIRTUAL_TABLE } from "@/lib/workplace/forgeLexicon";

/**
 * Virtual Table application module — play zone integrated with the Library (CMDB).
 * UI lives in `src/features/tabletop/`; domain logic in `src/lib/tabletop/`.
 * Import from `@/modules/vtt` at app boundaries, not scattered lib paths.
 */
export const VTT_MODULE_ID = "vtt" as const;

export type VttModuleId = typeof VTT_MODULE_ID;

/** CI classes the VTT reads from the Library when loading prep. */
export const VTT_LIBRARY_READ_CI_CLASSES = [
  "party.roster",
  "character.sheet",
  "result.maps",
  "result.adventure",
  "result.realm",
  "seed.maps",
] as const satisfies readonly CiClass[];

/** CI classes owned by live / shelved table state. */
export const VTT_SESSION_CI_CLASSES = [
  "session.tabletop",
  "session.snapshot",
] as const satisfies readonly CiClass[];

export const VTT_MODULE = {
  id: VTT_MODULE_ID,
  label: VIRTUAL_TABLE,
  route: "/table",
  playerRoute: "/table/player",
  description:
    "Run sessions at the table — tokens, fog, initiative, and dice. Loads parties, maps, and sheets from The Library.",
  libraryReadCiClasses: VTT_LIBRARY_READ_CI_CLASSES,
  sessionCiClasses: VTT_SESSION_CI_CLASSES,
} as const;
