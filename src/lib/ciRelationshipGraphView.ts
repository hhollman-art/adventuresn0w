import type { SavedCampaign } from "@/lib/campaigns";
import type { CiClass } from "@/lib/ciRegistry";
import { ciClassForGameItem, ciClassForResult, ciClassForSeed } from "@/lib/ciRegistry";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import { seedDisplayName, type SavedRealmSeed } from "@/lib/realmSeeds";
import { getSrdEntity } from "@/lib/srd/corpus";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type {
  CampaignRelationshipGraph,
  CfEndpoint,
  CfRelationshipEdge,
  CfRelationshipVerb,
  DerivedMembershipEdge,
} from "@/lib/ciRelationshipGraph";
import { deriveCampaignMembershipEdges, mergeCampaignGraph } from "@/lib/ciRelationshipGraph";

export type CampaignGraphLibraryData = {
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  characters: SavedCharacter[];
  items: SavedGameItem[];
  parties: SavedCharacterRoster[];
};

export type GraphEdgeRow = {
  key: string;
  rel: CfRelationshipVerb;
  relLabel: string;
  fromLabel: string;
  toLabel: string;
  derived: boolean;
  edgeId?: string;
  label?: string;
};

const VERB_LABEL: Record<CfRelationshipVerb, string> = {
  contains: "Contains",
  lives_in: "Lives in",
  located_in: "Located in",
  member_of: "Member of",
  leads: "Leads",
  allied_with: "Allied with",
  opposed_to: "Opposed to",
  involves: "Involves",
  features: "Features",
  found_in: "Found in",
  owned_by: "Owned by",
  knows: "Knows",
  references: "References",
  linked_to: "Linked to",
  logged_in: "Logged in session",
};

/** Verbs the UI lets DMs add today (excludes derived contains and unshipped session). */
export const USER_ADDABLE_RELATIONSHIP_VERBS: CfRelationshipVerb[] = [
  "linked_to",
  "involves",
  "features",
  "owned_by",
  "references",
  "knows",
  "allied_with",
  "opposed_to",
  "lives_in",
  "found_in",
];

export type CampaignGraphEndpointOption = {
  key: string;
  endpoint: CfEndpoint;
  label: string;
  ciClass: CiClass | "rules.srd-entry";
};

function seedCiClass(seed: SavedRealmSeed): CiClass {
  return ciClassForSeed(seed.kind);
}

function resultCiClass(result: LibraryItem): CiClass {
  return ciClassForResult(result.kind);
}

function resolveCiClassForId(
  data: CampaignGraphLibraryData,
  id: string,
  fallback: CiClass,
): CiClass {
  const seed = data.seeds.find((s) => s.id === id);
  if (seed) return seedCiClass(seed);
  const result = data.results.find((r) => r.id === id);
  if (result) return resultCiClass(result);
  if (data.characters.some((c) => c.id === id)) return "character.sheet";
  const item = data.items.find((i) => i.id === id);
  if (item) return ciClassForGameItem(item.kind);
  if (data.parties.some((p) => p.id === id)) return "party.roster";
  return fallback;
}

export function resolveEndpointLabel(
  endpoint: CfEndpoint,
  data: CampaignGraphLibraryData,
): string {
  if (endpoint.kind === "srd") {
    const entity = getSrdEntity(endpoint.entityId);
    return entity?.name ?? endpoint.name ?? endpoint.entityId;
  }
  const { id, ciClass } = endpoint;
  const seed = data.seeds.find((s) => s.id === id);
  if (seed) return seedDisplayName(seed);
  const result = data.results.find((r) => r.id === id);
  if (result) return result.title;
  const character = data.characters.find((c) => c.id === id);
  if (character) return character.player.name;
  const item = data.items.find((i) => i.id === id);
  if (item) return item.name;
  const party = data.parties.find((p) => p.id === id);
  if (party) return party.name;
  return `${ciClass} · ${id.slice(0, 8)}…`;
}

export function buildCampaignEndpointOptions(
  campaign: SavedCampaign,
  data: CampaignGraphLibraryData,
): CampaignGraphEndpointOption[] {
  const options: CampaignGraphEndpointOption[] = [];
  const push = (endpoint: CfEndpoint, label: string, ciClass: CiClass | "rules.srd-entry") => {
    const key =
      endpoint.kind === "srd" ? `srd:${endpoint.entityId}` : `cf:${endpoint.ciClass}:${endpoint.id}`;
    options.push({ key, endpoint, label, ciClass });
  };

  if (campaign.partyId) {
    const party = data.parties.find((p) => p.id === campaign.partyId);
    if (party) {
      push({ kind: "cf", ciClass: "party.roster", id: party.id }, party.name, "party.roster");
    }
  }
  for (const id of campaign.seedIds) {
    const seed = data.seeds.find((s) => s.id === id);
    if (seed) {
      push({ kind: "cf", ciClass: seedCiClass(seed), id: seed.id }, seedDisplayName(seed), seedCiClass(seed));
    }
  }
  for (const id of campaign.resultIds) {
    const result = data.results.find((r) => r.id === id);
    if (result) {
      push(
        { kind: "cf", ciClass: resultCiClass(result), id: result.id },
        result.title,
        resultCiClass(result),
      );
    }
  }
  for (const id of campaign.characterIds) {
    const character = data.characters.find((c) => c.id === id);
    if (character) {
      push(
        { kind: "cf", ciClass: "character.sheet", id: character.id },
        character.player.name,
        "character.sheet",
      );
    }
  }
  for (const id of campaign.itemIds) {
    const item = data.items.find((i) => i.id === id);
    if (item) {
      const ciClass = ciClassForGameItem(item.kind);
      push({ kind: "cf", ciClass, id: item.id }, item.name, ciClass);
    }
  }
  return options;
}

function refineDerivedEdge(
  edge: DerivedMembershipEdge,
  data: CampaignGraphLibraryData,
): DerivedMembershipEdge {
  if (edge.to.kind !== "cf") return edge;
  const ciClass = resolveCiClassForId(data, edge.to.id, edge.to.ciClass);
  if (ciClass === edge.to.ciClass) return edge;
  return { ...edge, to: { ...edge.to, ciClass } };
}

export function buildCampaignGraphRows(
  campaign: SavedCampaign,
  graph: CampaignRelationshipGraph,
  data: CampaignGraphLibraryData,
  filter: "all" | "membership" | "semantic",
): GraphEdgeRow[] {
  const derived = deriveCampaignMembershipEdges(campaign).map((e) => refineDerivedEdge(e, data));
  const semantic = graph.edges;
  const merged: Array<CfRelationshipEdge | DerivedMembershipEdge> =
    filter === "membership"
      ? derived
      : filter === "semantic"
        ? semantic
        : [...derived, ...semantic];

  return merged.map((edge, index) => {
    const derivedEdge = "derivedFrom" in edge;
    return {
      key: derivedEdge ? `derived-${edge.derivedFrom}-${edge.to.kind === "cf" ? edge.to.id : index}` : edge.id,
      rel: edge.rel,
      relLabel: VERB_LABEL[edge.rel],
      fromLabel: resolveEndpointLabel(edge.from, data),
      toLabel: resolveEndpointLabel(edge.to, data),
      derived: derivedEdge,
      edgeId: derivedEdge ? undefined : edge.id,
      label: derivedEdge ? undefined : edge.label,
    };
  });
}

export { mergeCampaignGraph, VERB_LABEL };
