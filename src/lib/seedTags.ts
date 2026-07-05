import { REALM_SIZE_LABEL, type RealmSize } from "@/lib/realmPrompt";

import type { RealmScopeTag, SavedRealmSeed, SeedKind } from "@/lib/realmSeeds";

import {

  isRealmScopeSlug,

  realmScopeTagLabel,

  SEED_KINDS,

  seedMatchesRealmScope,

} from "@/lib/realmSeeds";



/** Suggested tags in the seed editor (click to add). */

export const SEED_TAG_SUGGESTIONS = [

  "campaign",

  "one-shot",

  "location",

  "faction",

  "npc",

  "session",

  "handout",

  "vtt",

] as const;



/** Seed kinds that are useful as sources on each workshop tab. */

export const WORKSHOP_TAB_SEED_KINDS: Record<SeedKind, readonly SeedKind[]> = {

  realm: ["realm", "adventure"],

  adventure: ["realm", "adventure"],

  characters: ["realm", "adventure", "characters"],

  maps: ["realm", "adventure", "maps"],

  props: ["realm", "adventure", "characters", "props", "maps"],

};



export function collectSeedTags(seeds: readonly SavedRealmSeed[]): string[] {

  const set = new Set<string>();

  for (const seed of seeds) {

    for (const tag of seed.tags ?? []) {

      set.add(tag);

    }

  }

  return [...set].sort((a, b) => a.localeCompare(b));

}



/** User-defined tags only — excludes realm scope / size slugs. */

export function collectUserSeedTags(seeds: readonly SavedRealmSeed[]): string[] {

  return collectSeedTags(seeds).filter((tag) => !isRealmScopeSlug(tag));

}



export type SeedListFilters = {

  kindFilter?: SeedKind | "all";

  tagFilter?: string | "all";

  scopeFilter?: RealmScopeTag | "all";

  /** When set, only seeds whose kind is in this list are shown. */

  limitToKinds?: readonly SeedKind[];

};



export function filterSeeds(

  seeds: readonly SavedRealmSeed[],

  filters: SeedListFilters,

): SavedRealmSeed[] {

  let out = [...seeds];

  if (filters.limitToKinds?.length) {

    const allowed = new Set(filters.limitToKinds);

    out = out.filter((s) => allowed.has(s.kind));

  }

  if (filters.kindFilter && filters.kindFilter !== "all") {

    out = out.filter((s) => s.kind === filters.kindFilter);

  }

  if (filters.scopeFilter && filters.scopeFilter !== "all") {
    const scope = filters.scopeFilter;
    out = out.filter((s) => seedMatchesRealmScope(s, scope));
  }

  if (filters.tagFilter && filters.tagFilter !== "all") {

    out = out.filter((s) => s.tags?.includes(filters.tagFilter!));

  }

  return out;

}



export function seedTagLabel(tag: string): string {

  if ((SEED_KINDS as readonly string[]).includes(tag)) {

    return tag.charAt(0).toUpperCase() + tag.slice(1);

  }

  if (tag in REALM_SIZE_LABEL) {

    return REALM_SIZE_LABEL[tag as RealmSize].label.split(" (")[0] ?? tag;

  }

  if (

    tag === "village" ||

    tag === "world" ||

    tag === "continent" ||

    tag === "country" ||

    tag === "region" ||

    tag === "city"

  ) {

    return realmScopeTagLabel(tag as RealmScopeTag);

  }

  return tag.replace(/-/g, " ");

}


