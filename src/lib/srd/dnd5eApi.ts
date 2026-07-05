/** Client helpers for the D&D 5e SRD API (https://www.dnd5eapi.co/). */

export const DND5E_API_ORIGIN = "https://www.dnd5eapi.co";

/** API edition used for Library browse (2014 SRD includes rules, spells, and monsters). */
export const DND5E_API_VERSION = "2014";

export type SrdApiResource =
  | "rules"
  | "rule-sections"
  | "spells"
  | "monsters"
  | "classes"
  | "races"
  | "subclasses"
  | "equipment"
  | "magic-items"
  | "feats"
  | "backgrounds"
  | "conditions";

export type Dnd5eListItem = {
  index: string;
  name: string;
  url: string;
  level?: number;
  challenge_rating?: number;
};

export type Dnd5eListResponse = {
  count: number;
  results: Dnd5eListItem[];
};

export const SRD_API_CATEGORIES: {
  resource: SrdApiResource;
  label: string;
  description: string;
}[] = [
  {
    resource: "rule-sections",
    label: "Rules",
    description: "Combat, ability checks, magic, exploration, and more",
  },
  {
    resource: "rules",
    label: "Rule chapters",
    description: "Top-level chapter indexes with subsections",
  },
  {
    resource: "spells",
    label: "Spells",
    description: "Full spell descriptions from the SRD",
  },
  {
    resource: "monsters",
    label: "Monsters",
    description: "Stat blocks and abilities",
  },
  {
    resource: "classes",
    label: "Classes",
    description: "Class features, proficiencies, and subclasses",
  },
  {
    resource: "races",
    label: "Races",
    description: "Ancestry traits and abilities",
  },
  {
    resource: "subclasses",
    label: "Subclasses",
    description: "Subclass features from the SRD",
  },
  {
    resource: "equipment",
    label: "Equipment",
    description: "Weapons, armor, gear, and tools",
  },
  {
    resource: "magic-items",
    label: "Magic items",
    description: "Wondrous items, potions, and enchanted gear",
  },
  {
    resource: "feats",
    label: "Feats",
    description: "Optional character abilities",
  },
  {
    resource: "backgrounds",
    label: "Backgrounds",
    description: "Character backgrounds and features",
  },
  {
    resource: "conditions",
    label: "Conditions",
    description: "Blinded, grappled, poisoned, and other states",
  },
];

function proxyPath(resource: SrdApiResource, index?: string): string {
  const base = `/api/srd/${DND5E_API_VERSION}/${resource}`;
  return index ? `${base}/${encodeURIComponent(index)}` : base;
}

export async function fetchDnd5eList(resource: SrdApiResource): Promise<Dnd5eListItem[]> {
  const res = await fetch(proxyPath(resource));
  if (!res.ok) {
    throw new Error(`Could not load ${resource} list (${res.status})`);
  }
  const data = (await res.json()) as Dnd5eListResponse;
  return data.results ?? [];
}

export async function fetchDnd5eResource(
  resource: SrdApiResource,
  index: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(proxyPath(resource, index));
  if (!res.ok) {
    throw new Error(`Could not load ${resource}/${index} (${res.status})`);
  }
  return (await res.json()) as Record<string, unknown>;
}

export function srdListItemDetail(item: Dnd5eListItem, resource: SrdApiResource): string {
  if (resource === "spells" && item.level != null) {
    return item.level === 0 ? "Cantrip" : `Level ${item.level}`;
  }
  if (resource === "monsters" && item.challenge_rating != null) {
    return `CR ${item.challenge_rating}`;
  }
  return "";
}
