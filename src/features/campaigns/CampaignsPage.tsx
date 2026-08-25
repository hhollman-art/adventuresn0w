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
import { deleteCampaignRelationshipGraph } from "@/lib/campaignRelationships";
import CampaignWorkspace from "@/features/campaigns/CampaignWorkspace";
import { activateCampaign } from "@/lib/campaignSwitch";
import { deleteCampaignTableSnapshot } from "@/lib/tabletop/store";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import {
  loadSavedCharacterRosters,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import {
  loadRealmSeeds,
  type SavedRealmSeed,
} from "@/lib/realmSeeds";
import {
  loadGenerationLibraryItems,
  type LibraryItem,
} from "@/lib/generationLibrary";
import {
  loadSavedGameItems,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import {
  loadSavedCharacters,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { loadSavedNpcs, type SavedNpc } from "@/lib/worldAssets/npc";
import { loadSavedLocations, type SavedLocation } from "@/lib/worldAssets/location";
import { formatPartyUpdated } from "@/lib/tabletop/partyCampaign";
import { workplace } from "@/lib/workplace";
import { APP_ICONS } from "@/lib/ui/appIcons";
import WorkshopPageShell from "@/features/workshop/WorkshopPageShell";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [parties, setParties] = useState<SavedCharacterRoster[]>([]);
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [items, setItems] = useState<SavedGameItem[]>([]);
  const [seeds, setSeeds] = useState<SavedRealmSeed[]>([]);
  const [results, setResults] = useState<LibraryItem[]>([]);
  const [npcs, setNpcs] = useState<SavedNpc[]>([]);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    const [list, rosters, charList, itemList, seedList, resultList, npcList, locationList] =
      await Promise.all([
        loadCampaigns(),
        loadSavedCharacterRosters(),
        loadSavedCharacters(),
        loadSavedGameItems(),
        loadRealmSeeds(),
        loadGenerationLibraryItems(),
        loadSavedNpcs(),
        loadSavedLocations(),
      ]);
    setCampaigns(list);
    setParties(rosters);
    setCharacters(charList);
    setItems(itemList);
    setSeeds(seedList);
    setResults(resultList);
    setNpcs(npcList);
    setLocations(locationList);
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
    setStatus("Campaign created — name it, then drop cards into the buckets.");
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
    await deleteCampaignRelationshipGraph(campaign.id);
    const list = await deleteCampaign(campaign.id);
    setCampaigns(list);
    setActiveId(getActiveCampaignId());
    scheduleLibrarySnapshot();
    if (expandedId === campaign.id) setExpandedId(null);
    setStatus(
      `Deleted campaign “${campaign.name}”. Its party and Library cards are still on this device.`,
    );
  };

  return (
    <WorkshopPageShell>
      <div className="workshop-page-panel panel-scroll forge-forest-panel fantasy-panel rounded-xl border p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="zone-badge mb-3">Campaign workplace</p>
          <h1 className="font-display text-2xl font-bold">
            <span aria-hidden="true">{APP_ICONS.campaign} </span>
            {workplace("campaigns").label}
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--text-soft)]">
            One campaign per group you run. Open a campaign and drop cards into five buckets —
            Party, Quests, Locations, Encounters, and Loot. Click a card to inspect it; press × to
            take it out of the campaign without deleting it from your Library.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FantasyTooltipWrap label="New campaign" hint="Create a chronicle for another group you run">
            <button type="button" onClick={() => void createCampaign()} className="btn btn-sm btn-accent">
              New campaign
            </button>
          </FantasyTooltipWrap>
          <FantasyTooltipWrap label="Library" hint="Browse your saved prep and imports">
            <Link href="/library" className="btn btn-sm">
              Library
            </Link>
          </FantasyTooltipWrap>
        </div>
      </div>

      {status ? (
        <p
          className="mb-4 rounded-lg border px-3 py-2 text-sm text-[var(--text)]"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.1)" }}
          role="status"
        >
          {status}
        </p>
      ) : null}

      {campaigns.length === 0 ? (
        <div
          className="workshop-campaign-card rounded-xl border p-8 text-center text-sm text-[var(--text-soft)]"
          style={{ borderColor: "var(--border)" }}
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
                className="workshop-campaign-card rounded-xl border"
                style={{
                  borderColor: isActive ? "var(--accent)" : "var(--border)",
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer flex-wrap items-start gap-2 p-4"
                  onClick={() => setExpandedId(open ? null : campaign.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(open ? null : campaign.id);
                    }
                  }}
                  aria-expanded={open}
                  aria-label={open ? `Collapse ${campaign.name}` : `Open ${campaign.name} workspace`}
                >
                  <div className="min-w-0 flex-1 text-left">
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
                        className="mb-1 w-full max-w-md rounded border bg-transparent px-1 py-0.5 font-display text-lg font-bold text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        style={{ borderColor: "transparent" }}
                        aria-label="Campaign name"
                      />
                      {isActive ? (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                        >
                          Active
                        </span>
                      ) : null}
                    </span>
                    <p className="text-xs text-[var(--text-soft)]">
                      {party ? `Party: ${party.name}` : "No party yet"} · Updated{" "}
                      {formatPartyUpdated(campaign.updatedAt)}
                    </p>
                  </div>
                  <div
                    className="flex flex-wrap gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {isActive ? (
                      <FantasyTooltipWrap
                        label="Close campaign"
                        hint="Shelve this campaign's table and step out of campaign mode"
                      >
                        <button
                          type="button"
                          disabled={switching}
                          onClick={() => void closeCampaign()}
                          className="rounded-md border px-2.5 py-1.5 text-xs font-semibold"
                          style={{ borderColor: "var(--accent-dim)" }}
                        >
                          Close campaign
                        </button>
                      </FantasyTooltipWrap>
                    ) : (
                      <FantasyTooltipWrap
                        label="Activate for VTT"
                        hint="Make this the active campaign and restore its Virtual Table"
                      >
                        <button
                          type="button"
                          disabled={switching}
                          onClick={() => void openCampaign(campaign)}
                          className="rounded-md border px-2.5 py-1.5 text-xs font-semibold"
                          style={{ borderColor: "var(--border)" }}
                        >
                          Activate for VTT
                        </button>
                      </FantasyTooltipWrap>
                    )}
                    <FantasyTooltipWrap
                      label="Delete"
                      hint="Delete the campaign record — linked content stays in your library"
                    >
                      <button
                        type="button"
                        onClick={() => void removeCampaign(campaign)}
                        className="rounded-md border px-2.5 py-1.5 text-xs text-red-800"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Delete
                      </button>
                    </FantasyTooltipWrap>
                  </div>
                </div>

                {open ? (
                  <div className="border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-bold tracking-wide uppercase text-[var(--text)]">
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
                        className="w-full rounded-lg border px-3 py-2 text-sm text-[var(--text)]"
                        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                      />
                    </div>

                    <div className="mb-3">
                      <p className="mb-1 text-xs font-bold tracking-wide uppercase text-[var(--text)]">
                        Default party
                      </p>
                      <select
                        value={campaign.partyId ?? ""}
                        onChange={(e) =>
                          void patchCampaign(campaign.id, {
                            partyId: e.target.value || null,
                          })
                        }
                        className="w-full max-w-md rounded-lg border px-3 py-2 text-sm text-[var(--text)]"
                        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                        aria-label="Default party"
                      >
                        <option value="">No party chosen yet</option>
                        {parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.players.length} PC{p.players.length === 1 ? "" : "s"})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                        Build fellowships in{" "}
                        <Link
                          href="/tavern"
                          className="font-semibold text-[var(--accent)] underline"
                        >
                          The Tavern
                        </Link>
                        . You can also drop heroes into the Active Party bucket below.
                      </p>
                    </div>

                    <CampaignWorkspace
                      campaign={campaign}
                      characters={characters}
                      parties={parties}
                      items={items}
                      seeds={seeds}
                      results={results}
                      npcs={npcs}
                      locations={locations}
                      onChanged={() => void refresh()}
                      onStatus={setStatus}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </WorkshopPageShell>
  );
}
