/**
 * Campaign relationship graph — spec v1 types and validation.
 *
 * Tier 1 (membership): SavedCampaign id lists — unchanged, authoritative.
 * Tier 2 (this module): typed semantic edges stored beside campaigns.
 *
 * JSON schemas: schemas/creation-files/relationship-graph.json
 * Verb catalog: schemas/creation-files/relationship-verbs.json
 */

import type { SavedCampaign } from "@/lib/campaigns";
import type { CiClass } from "@/lib/ciRegistry";
import { CI_REGISTRY } from "@/lib/ciRegistry";
import type { SrdEntityId } from "@/lib/srd/types";
import { CAMPAIGN_LINK_FIELDS, type CampaignLinkField } from "@/lib/ciRelationships";

/** Endpoint — a CF row or bundled SRD entity. */
export type CfEndpoint =
  | { kind: "cf"; ciClass: CiClass; id: string }
  | { kind: "srd"; entityId: SrdEntityId; name?: string };

export type CfRelationshipSource = "user" | "auto" | "import";

/** One persisted semantic edge (Tier 2). */
export type CfRelationshipEdge = {
  id: string;
  rel: CfRelationshipVerb;
  from: CfEndpoint;
  to: CfEndpoint;
  label?: string;
  createdAt: string;
  source?: CfRelationshipSource;
  bidirectional?: boolean;
};

/** Per-campaign graph document (Tier 2 store). */
export type CampaignRelationshipGraph = {
  campaignId: string;
  version: number;
  updatedAt: string;
  edges: CfRelationshipEdge[];
};

/** Derived Tier-1 membership edge — computed, never persisted in edges[]. */
export type DerivedMembershipEdge = {
  rel: "contains";
  from: { kind: "cf"; ciClass: "campaign.record"; id: string };
  to: CfEndpoint;
  derivedFrom: CampaignLinkField;
};

export type CfRelationshipVerb =
  | "contains"
  | "lives_in"
  | "located_in"
  | "member_of"
  | "leads"
  | "allied_with"
  | "opposed_to"
  | "involves"
  | "features"
  | "found_in"
  | "owned_by"
  | "knows"
  | "references"
  | "linked_to"
  | "logged_in";

type VerbRule = {
  rel: CfRelationshipVerb;
  derived?: boolean;
  from: readonly string[];
  to: readonly string[];
  allowsSrdTarget?: boolean;
  excludeSrdSource?: boolean;
};

/** Mirrors schemas/creation-files/relationship-verbs.json */
export const CF_RELATIONSHIP_VERB_RULES: VerbRule[] = [
  {
    rel: "contains",
    derived: true,
    from: ["campaign.record"],
    to: [
      "seed.realm",
      "seed.adventure",
      "seed.characters",
      "seed.maps",
      "seed.props",
      "result.realm",
      "result.adventure",
      "result.characters",
      "result.maps",
      "result.props",
      "party.roster",
      "character.sheet",
      "item.equipment",
      "item.magic",
    ],
  },
  { rel: "lives_in", from: ["character.sheet", "npc.record"], to: ["location.record", "seed.realm", "seed.maps"] },
  { rel: "located_in", from: ["location.record", "seed.maps"], to: ["location.record", "seed.realm"] },
  { rel: "member_of", from: ["character.sheet", "npc.record"], to: ["faction.record"] },
  { rel: "leads", from: ["character.sheet", "npc.record"], to: ["faction.record"] },
  {
    rel: "allied_with",
    from: ["faction.record", "character.sheet", "npc.record"],
    to: ["faction.record", "character.sheet", "npc.record"],
  },
  {
    rel: "opposed_to",
    from: ["faction.record", "character.sheet", "npc.record"],
    to: ["faction.record", "character.sheet", "npc.record"],
  },
  {
    rel: "involves",
    from: ["seed.adventure", "result.adventure", "encounter.record"],
    to: ["npc.record", "location.record", "faction.record", "character.sheet", "encounter.record"],
  },
  {
    rel: "features",
    from: ["seed.adventure", "result.adventure", "seed.realm", "result.realm"],
    to: ["npc.record", "location.record", "encounter.record"],
  },
  {
    rel: "found_in",
    from: ["item.equipment", "item.magic", "item.srd-equipment", "item.srd-magic"],
    to: ["location.record", "seed.adventure", "result.adventure", "encounter.record"],
  },
  { rel: "owned_by", from: ["item.equipment", "item.magic"], to: ["character.sheet", "npc.record"] },
  {
    rel: "knows",
    from: ["npc.record", "character.sheet"],
    to: ["npc.record", "character.sheet", "faction.record", "location.record"],
  },
  {
    rel: "references",
    from: [
      "seed.realm",
      "seed.adventure",
      "seed.characters",
      "seed.maps",
      "seed.props",
      "result.realm",
      "result.adventure",
      "result.characters",
      "result.maps",
      "result.props",
      "session.record",
    ],
    to: [
      "rules.srd-entry",
      "seed.realm",
      "seed.adventure",
      "npc.record",
      "location.record",
      "faction.record",
    ],
    allowsSrdTarget: true,
  },
  { rel: "linked_to", from: ["*"], to: ["*"], excludeSrdSource: true },
  { rel: "logged_in", from: ["session.record"], to: ["*"] },
];

function endpointClass(endpoint: CfEndpoint): string {
  if (endpoint.kind === "srd") return "rules.srd-entry";
  return endpoint.ciClass;
}

function classMatches(ruleClass: string, actual: string): boolean {
  return ruleClass === "*" || ruleClass === actual;
}

function verbRule(rel: CfRelationshipVerb): VerbRule | undefined {
  return CF_RELATIONSHIP_VERB_RULES.find((r) => r.rel === rel);
}

export type ValidateEdgeResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Validate a Tier-2 edge against the verb catalog. */
export function validateCfRelationshipEdge(edge: CfRelationshipEdge): ValidateEdgeResult {
  if (edge.rel === "contains") {
    return { ok: false, reason: "contains edges are derived from campaign membership — do not persist" };
  }

  const rule = verbRule(edge.rel);
  if (!rule) return { ok: false, reason: `Unknown relationship verb: ${edge.rel}` };

  if (edge.from.kind === "srd" && rule.excludeSrdSource) {
    return { ok: false, reason: `${edge.rel} cannot originate from an SRD endpoint` };
  }

  const fromClass = endpointClass(edge.from);
  const toClass = endpointClass(edge.to);

  if (edge.to.kind === "srd" && !rule.allowsSrdTarget && edge.rel !== "linked_to") {
    return { ok: false, reason: `${edge.rel} cannot target an SRD endpoint` };
  }

  const fromOk = rule.from.some((c) => classMatches(c, fromClass));
  const toOk =
    edge.to.kind === "srd"
      ? Boolean(rule.allowsSrdTarget)
      : rule.to.some((c) => classMatches(c, toClass));

  if (!fromOk) {
    return { ok: false, reason: `${edge.rel} not allowed from ${fromClass}` };
  }
  if (!toOk) {
    return { ok: false, reason: `${edge.rel} not allowed to ${toClass}` };
  }

  if (edge.from.kind === "cf") {
    const planned = ["npc.record", "location.record", "faction.record", "encounter.record", "session.record"];
    const fromKnown =
      CI_REGISTRY[edge.from.ciClass as keyof typeof CI_REGISTRY] ||
      planned.includes(edge.from.ciClass);
    if (!fromKnown) {
      return { ok: false, reason: `Unknown from ciClass: ${edge.from.ciClass}` };
    }
  }

  return { ok: true };
}

/** Build read-only contains edges from existing SavedCampaign link fields. */
export function deriveCampaignMembershipEdges(campaign: SavedCampaign): DerivedMembershipEdge[] {
  const from = {
    kind: "cf" as const,
    ciClass: "campaign.record" as const,
    id: campaign.id,
  };
  const edges: DerivedMembershipEdge[] = [];

  if (campaign.partyId) {
    edges.push({
      rel: "contains",
      from,
      to: { kind: "cf", ciClass: "party.roster", id: campaign.partyId },
      derivedFrom: "partyId",
    });
  }

  for (const id of campaign.seedIds) {
    edges.push({
      rel: "contains",
      from,
      to: { kind: "cf", ciClass: "seed.realm", id },
      derivedFrom: "seedIds",
    });
  }
  for (const id of campaign.resultIds) {
    edges.push({
      rel: "contains",
      from,
      to: { kind: "cf", ciClass: "result.realm", id },
      derivedFrom: "resultIds",
    });
  }
  for (const id of campaign.characterIds) {
    edges.push({
      rel: "contains",
      from,
      to: { kind: "cf", ciClass: "character.sheet", id },
      derivedFrom: "characterIds",
    });
  }
  for (const id of campaign.itemIds) {
    edges.push({
      rel: "contains",
      from,
      to: { kind: "cf", ciClass: "item.equipment", id },
      derivedFrom: "itemIds",
    });
  }

  return edges;
}

/** Merge Tier-1 derived edges with Tier-2 persisted edges for graph display. */
export function mergeCampaignGraph(
  campaign: SavedCampaign,
  graph: CampaignRelationshipGraph,
): Array<CfRelationshipEdge | DerivedMembershipEdge> {
  return [...deriveCampaignMembershipEdges(campaign), ...graph.edges];
}

/** Reverse lookup: campaigns whose Tier-2 graph touches an endpoint id. */
export function graphsLinkingEndpoint(
  graphs: CampaignRelationshipGraph[],
  endpointId: string,
): CampaignRelationshipGraph[] {
  return graphs.filter((g) =>
    g.edges.some(
      (e) =>
        (e.from.kind === "cf" && e.from.id === endpointId) ||
        (e.to.kind === "cf" && e.to.id === endpointId),
    ),
  );
}

/** Re-export for callers that need link field names. */
export { CAMPAIGN_LINK_FIELDS };
