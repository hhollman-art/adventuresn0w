"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteCampaign,
  getActiveCampaignId,
  loadCampaigns,
  onActiveCampaignChanged,
  onCampaignsChanged,
  saveCampaign,
  updateCampaign,
  type SavedCampaign,
} from "@/lib/campaigns";
import { activateCampaign } from "@/lib/campaignSwitch";
import { deleteCampaignTableSnapshot } from "@/lib/tabletop/store";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import {
  loadSavedCharacterRosters,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import {
  loadRealmSeeds,
  seedDisplayName,
  SEED_KIND_LABEL,
  type SavedRealmSeed,
} from "@/lib/realmSeeds";
import {
  loadGenerationLibraryItems,
  LIBRARY_KIND_LABEL,
  type LibraryItem,
} from "@/lib/generationLibrary";
import { formatPartyUpdated } from "@/lib/tabletop/partyCampaign";

function CheckRow({
  checked,
  label,
  detail,
  onToggle,
}: {
  checked: boolean;
  label: string;
  detail: string;
  onToggle: () => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs"
      style={{ borderColor: checked ? "var(--accent-dim)" : "var(--border)" }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block font-semibold text-[var(--text)]">{label}</span>
        <span className="block text-[var(--muted)]">{detail}</span>
      </span>
    </label>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [parties, setParties] = useState<SavedCharacterRoster[]>([]);
  const [seeds, setSeeds] = useState<SavedRealmSeed[]>([]);
  const [results, setResults] = useState<LibraryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    const [list, rosters, seedList, resultList] = await Promise.all([
      loadCampaigns(),
      loadSavedCharacterRosters(),
      loadRealmSeeds(),
      loadGenerationLibraryItems(),
    ]);
    setCampaigns(list);
    setParties(rosters);
    setSeeds(seedList);
    setResults(resultList);
    setActiveId(getActiveCampaignId());
  }, []);

  useEffect(() => {
    void refresh();
    const offCampaigns = onCampaignsChanged(() => void refresh());
    const offActive = onActiveCampaignChanged(() => setActiveId(getActiveCampaignId()));
    return () => {
      offCampaigns();
      offActive();
    };
  }, [refresh]);

  const createCampaign = async () => {
    const list = await saveCampaign({ name: "New campaign" });
    setCampaigns(list);
    scheduleLibrarySnapshot();
    if (list[0]) setExpandedId(list[0].id);
    setStatus("Campaign created — name it, pick its party, and link its prep.");
  };

  const patchCampaign = async (
    id: string,
    patch: Parameters<typeof updateCampaign>[1],
  ) => {
    const list = await updateCampaign(id, patch);
    setCampaigns(list);
    scheduleLibrarySnapshot();
  };

  const openCampaign = async (campaign: SavedCampaign) => {
    setSwitching(true);
    setStatus(`Opening “${campaign.name}” — restoring its table…`);
    await activateCampaign(campaign.id);
    window.location.href = "/table";
  };

  const closeCampaign = async () => {
    setSwitching(true);
    setStatus("Closing campaign — shelving its table…");
    await activateCampaign(null);
    setSwitching(false);
    setActiveId(null);
    setStatus("Campaign closed. The table is back to how it was before any campaign.");
  };

  const removeCampaign = async (campaign: SavedCampaign) => {
    if (campaign.id === activeId) {
      await activateCampaign(null);
    }
    await deleteCampaignTableSnapshot(campaign.id);
    const list = await deleteCampaign(campaign.id);
    setCampaigns(list);
    setActiveId(getActiveCampaignId());
    scheduleLibrarySnapshot();
    if (expandedId === campaign.id) setExpandedId(null);
    setStatus(
      `Deleted campaign “${campaign.name}”. Its party, seeds, and results are still in your library.`,
    );
  };

  const toggleSeed = (campaign: SavedCampaign, seedId: string) => {
    const linked = campaign.seedIds.includes(seedId);
    void patchCampaign(campaign.id, {
      seedIds: linked
        ? campaign.seedIds.filter((id) => id !== seedId)
        : [...campaign.seedIds, seedId],
    });
  };

  const toggleResult = (campaign: SavedCampaign, resultId: string) => {
    const linked = campaign.resultIds.includes(resultId);
    void patchCampaign(campaign.id, {
      resultIds: linked
        ? campaign.resultIds.filter((id) => id !== resultId)
        : [...campaign.resultIds, resultId],
    });
  };

  return (
    <main className="app-main app-main--workshop mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="zone-badge mb-3">Campaigns</p>
          <h1 className="font-display text-2xl font-bold">Your campaigns</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            One campaign per group you run. Each campaign links a party plus the seeds and
            results that belong to its story, and keeps its own Virtual Table — open a
            campaign and the table comes back exactly as that group left it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void createCampaign()} className="btn btn-sm btn-accent">
            New campaign
          </button>
          <Link href="/library" className="btn btn-sm">
            Library
          </Link>
        </div>
      </div>

      {status ? (
        <p
          className="mb-4 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.1)" }}
          role="status"
        >
          {status}
        </p>
      ) : null}

      {campaigns.length === 0 ? (
        <div
          className="rounded-xl border p-8 text-center text-sm text-[var(--muted)]"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="mb-2">No campaigns yet.</p>
          <p>
            Click <strong className="text-[var(--text)]">New campaign</strong> to set up your
            first group — running two different tables is exactly what campaigns are for.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((campaign) => {
            const open = expandedId === campaign.id;
            const isActive = campaign.id === activeId;
            const party = campaign.partyId
              ? parties.find((p) => p.id === campaign.partyId)
              : undefined;
            return (
              <li
                key={campaign.id}
                className="rounded-xl border"
                style={{
                  borderColor: isActive ? "var(--accent)" : "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div className="flex flex-wrap items-start gap-2 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(open ? null : campaign.id)}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <input
                        value={campaign.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const name = e.target.value;
                          setCampaigns((prev) =>
                            prev.map((c) => (c.id === campaign.id ? { ...c, name } : c)),
                          );
                        }}
                        onBlur={(e) => void patchCampaign(campaign.id, { name: e.target.value })}
                        className="mb-1 w-full max-w-md rounded border bg-transparent px-1 py-0.5 font-display text-lg font-bold outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        style={{ borderColor: "transparent" }}
                        aria-label="Campaign name"
                      />
                      {isActive ? (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                        >
                          Open now
                        </span>
                      ) : null}
                    </span>
                    <p className="text-xs text-[var(--muted)]">
                      {party ? `Party: ${party.name}` : "No party linked"} ·{" "}
                      {campaign.seedIds.length} seed{campaign.seedIds.length === 1 ? "" : "s"} ·{" "}
                      {campaign.resultIds.length} result
                      {campaign.resultIds.length === 1 ? "" : "s"} · Updated{" "}
                      {formatPartyUpdated(campaign.updatedAt)}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-1">
                    {isActive ? (
                      <button
                        type="button"
                        disabled={switching}
                        onClick={() => void closeCampaign()}
                        className="rounded-md border px-2.5 py-1.5 text-xs font-semibold"
                        style={{ borderColor: "var(--accent-dim)" }}
                        title="Shelve this campaign's table and step out of campaign mode"
                      >
                        Close campaign
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={switching}
                        onClick={() => void openCampaign(campaign)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-white"
                        style={{ background: "var(--accent)" }}
                        title="Make this the active campaign and restore its Virtual Table"
                      >
                        Open campaign
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeCampaign(campaign)}
                      className="rounded-md border px-2.5 py-1.5 text-xs text-red-800"
                      style={{ borderColor: "var(--border)" }}
                      title="Delete the campaign record — linked content stays in your library"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className="border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-bold tracking-wide uppercase">
                        What is this campaign about?
                      </p>
                      <textarea
                        value={campaign.description}
                        onChange={(e) => {
                          const description = e.target.value;
                          setCampaigns((prev) =>
                            prev.map((c) =>
                              c.id === campaign.id ? { ...c, description } : c,
                            ),
                          );
                        }}
                        onBlur={(e) =>
                          void patchCampaign(campaign.id, { description: e.target.value })
                        }
                        rows={2}
                        placeholder="The premise, the group, the night you play…"
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                      />
                    </div>

                    <div className="mb-3">
                      <p className="mb-1 text-xs font-bold tracking-wide uppercase">Party</p>
                      <select
                        value={campaign.partyId ?? ""}
                        onChange={(e) =>
                          void patchCampaign(campaign.id, {
                            partyId: e.target.value || null,
                          })
                        }
                        className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                        aria-label="Linked party"
                      >
                        <option value="">No party linked yet</option>
                        {parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.players.length} PC{p.players.length === 1 ? "" : "s"})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        Manage rosters on the{" "}
                        <Link
                          href="/parties"
                          className="font-semibold text-[var(--accent)] underline"
                        >
                          Parties
                        </Link>{" "}
                        page.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-bold tracking-wide uppercase">
                          Linked seeds
                        </p>
                        {seeds.length === 0 ? (
                          <p className="text-xs text-[var(--muted)]">
                            No seeds in your library yet.
                          </p>
                        ) : (
                          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
                            {seeds.map((seed) => (
                              <CheckRow
                                key={seed.id}
                                checked={campaign.seedIds.includes(seed.id)}
                                label={seedDisplayName(seed)}
                                detail={SEED_KIND_LABEL[seed.kind]}
                                onToggle={() => toggleSeed(campaign, seed.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold tracking-wide uppercase">
                          Linked results
                        </p>
                        {results.length === 0 ? (
                          <p className="text-xs text-[var(--muted)]">
                            No saved results in your library yet.
                          </p>
                        ) : (
                          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
                            {results.map((item) => (
                              <CheckRow
                                key={item.id}
                                checked={campaign.resultIds.includes(item.id)}
                                label={item.title}
                                detail={LIBRARY_KIND_LABEL[item.kind]}
                                onToggle={() => toggleResult(campaign, item.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                      Links are references — the same seed or result can belong to several
                      campaigns, and deleting a campaign never deletes the linked content.
                      While this campaign is open, the Library highlights its content and new
                      creations link to it automatically.
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
