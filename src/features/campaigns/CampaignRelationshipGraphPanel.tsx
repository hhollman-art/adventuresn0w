"use client";

import { useMemo, useState } from "react";
import type { SavedCampaign } from "@/lib/campaigns";
import {
  addCampaignRelationshipEdge,
  removeCampaignRelationshipEdge,
} from "@/lib/campaignRelationships";
import type { CampaignRelationshipGraph } from "@/lib/ciRelationshipGraph";
import type { CfRelationshipVerb } from "@/lib/ciRelationshipGraph";
import {
  buildCampaignEndpointOptions,
  buildCampaignGraphRows,
  USER_ADDABLE_RELATIONSHIP_VERBS,
  VERB_LABEL,
  type CampaignGraphLibraryData,
} from "@/lib/ciRelationshipGraphView";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";

type CampaignRelationshipGraphPanelProps = {
  campaign: SavedCampaign;
  graph: CampaignRelationshipGraph;
  data: CampaignGraphLibraryData;
  onGraphChange: (graph: CampaignRelationshipGraph) => void;
  onStatus: (message: string | null) => void;
};

type GraphFilter = "all" | "membership" | "semantic";

export default function CampaignRelationshipGraphPanel({
  campaign,
  graph,
  data,
  onGraphChange,
  onStatus,
}: CampaignRelationshipGraphPanelProps) {
  const [filter, setFilter] = useState<GraphFilter>("all");
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [rel, setRel] = useState<CfRelationshipVerb>("linked_to");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const endpointOptions = useMemo(
    () => buildCampaignEndpointOptions(campaign, data),
    [campaign, data],
  );

  const rows = useMemo(
    () => buildCampaignGraphRows(campaign, graph, data, filter),
    [campaign, graph, data, filter],
  );

  const membershipCount = buildCampaignGraphRows(campaign, graph, data, "membership").length;
  const semanticCount = graph.edges.length;

  const addLink = async () => {
    const from = endpointOptions.find((o) => o.key === fromKey)?.endpoint;
    const to = endpointOptions.find((o) => o.key === toKey)?.endpoint;
    if (!from || !to) {
      onStatus("Pick both endpoints before adding a link.");
      return;
    }
    if (fromKey === toKey) {
      onStatus("Choose two different Creation Files.");
      return;
    }
    setBusy(true);
    onStatus(null);
    const result = await addCampaignRelationshipEdge(campaign.id, {
      rel,
      from,
      to,
      label: note.trim() || undefined,
    });
    setBusy(false);
    if (result.error) {
      onStatus(result.error);
      return;
    }
    onGraphChange(result.graph);
    scheduleLibrarySnapshot();
    setNote("");
    onStatus("Relationship link added.");
  };

  const removeLink = async (edgeId: string) => {
    setBusy(true);
    onStatus(null);
    const next = await removeCampaignRelationshipEdge(campaign.id, edgeId);
    setBusy(false);
    onGraphChange(next);
    scheduleLibrarySnapshot();
    onStatus("Relationship link removed.");
  };

  return (
    <div
      className="mt-4 rounded-lg border p-3"
      style={{ borderColor: "var(--border)", background: "rgba(154, 116, 22, 0.03)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
            Relationship graph
          </p>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-[var(--text-soft)]">
            Membership links come from the checkboxes above (read-only here). Add semantic links
            — e.g. an adventure <strong className="text-[var(--text)]">involves</strong> a hero,
            or an item is <strong className="text-[var(--text)]">owned by</strong> a character.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", `All (${membershipCount + semanticCount})`],
              ["membership", `Membership (${membershipCount})`],
              ["semantic", `Your links (${semanticCount})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{
                borderColor: filter === key ? "var(--accent)" : "var(--border)",
                background: filter === key ? "rgba(201,162,39,0.14)" : "transparent",
                color: filter === key ? "var(--accent)" : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {endpointOptions.length < 2 ? (
        <p className="mt-3 text-xs text-[var(--text-soft)]">
          Link at least two CFs to this campaign above before adding semantic relationships.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            From
            <select
              value={fromKey}
              onChange={(e) => setFromKey(e.target.value)}
              className="rounded border px-2 py-1.5 text-xs text-[var(--text)]"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <option value="">Choose…</option>
              {endpointOptions.map((opt) => (
                <option key={`from-${opt.key}`} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            Relationship
            <select
              value={rel}
              onChange={(e) => setRel(e.target.value as CfRelationshipVerb)}
              className="rounded border px-2 py-1.5 text-xs text-[var(--text)]"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              {USER_ADDABLE_RELATIONSHIP_VERBS.map((verb) => (
                <option key={verb} value={verb}>
                  {VERB_LABEL[verb]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            To
            <select
              value={toKey}
              onChange={(e) => setToKey(e.target.value)}
              className="rounded border px-2 py-1.5 text-xs text-[var(--text)]"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <option value="">Choose…</option>
              {endpointOptions.map((opt) => (
                <option key={`to-${opt.key}`} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            Note (optional)
            <div className="flex gap-1">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this link matters"
                className="min-w-0 flex-1 rounded border px-2 py-1.5 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void addLink()}
                className="shrink-0 rounded px-2 py-1.5 text-xs font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                Add
              </button>
            </div>
          </label>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--text-soft)]">
          {filter === "semantic"
            ? "No custom links yet — add one above."
            : "No links to show for this filter."}
        </p>
      ) : (
        <ul className="mt-3 flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1.5 text-xs"
              style={{
                borderColor: row.derived ? "var(--border)" : "var(--accent-dim)",
                background: row.derived ? "transparent" : "rgba(201,162,39,0.06)",
              }}
            >
              <span className="font-semibold text-[var(--accent)]">{row.relLabel}</span>
              <span className="text-[var(--text)]">{row.fromLabel}</span>
              <span className="text-[var(--muted)]">→</span>
              <span className="text-[var(--text)]">{row.toLabel}</span>
              {row.label ? (
                <span className="text-[var(--muted)]">· {row.label}</span>
              ) : null}
              {row.derived ? (
                <span className="ml-auto rounded-full border px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                  membership
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => row.edgeId && void removeLink(row.edgeId)}
                  className="ml-auto text-[10px] font-semibold text-red-800"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
