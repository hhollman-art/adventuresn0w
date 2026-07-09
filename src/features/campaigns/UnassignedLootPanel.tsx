"use client";

import { useMemo, useState } from "react";
import type { SavedCampaign } from "@/lib/campaigns";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import {
  assignCampaignLootToCharacter,
  cloneLibraryItemToCampaignLoot,
  listUnassignedLoot,
} from "@/lib/workshop/cfCloneWritePath";
import { GAME_ITEM_KIND_LABEL } from "@/lib/itemLibrary";

/**
 * Campaign "Unassigned Loot / Reward List".
 * Clone items from Library into this staging list, then assign to a party hero
 * (deep-embeds onto the character sheet via the single CF write path).
 */
export default function UnassignedLootPanel({
  campaign,
  items,
  characters,
  onChanged,
}: {
  campaign: SavedCampaign;
  items: SavedGameItem[];
  characters: SavedCharacter[];
  onChanged: () => void;
}) {
  const loot = useMemo(() => listUnassignedLoot(campaign, items), [campaign, items]);
  const libraryPool = useMemo(() => {
    const staged = new Set(campaign.unassignedLootIds ?? []);
    return items.filter((item) => !staged.has(item.id));
  }, [campaign.unassignedLootIds, items]);

  const [cloneId, setCloneId] = useState("");
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const partyCharacters = characters.filter(
    (c) =>
      campaign.characterIds.includes(c.id) ||
      (campaign.partyId && c.id) /* party members may be separate */,
  );

  async function onCloneFromLibrary() {
    if (!cloneId) return;
    setBusy(true);
    setStatus(null);
    const result = await cloneLibraryItemToCampaignLoot(cloneId, campaign.id);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus("Cloned into Unassigned Loot — still in The Library too.");
    setCloneId("");
    onChanged();
  }

  async function onAssign(libraryItemId: string) {
    const characterId = assignTarget[libraryItemId];
    if (!characterId) {
      setStatus("Pick a hero before assigning loot.");
      return;
    }
    setBusy(true);
    setStatus(null);
    const result = await assignCampaignLootToCharacter({
      campaignId: campaign.id,
      libraryItemId,
      characterId,
      equipped: true,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus("Loot assigned to hero sheet (stats will recalculate).");
    onChanged();
  }

  return (
    <section
      className="mt-4 rounded-md border p-3"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <h3 className="text-sm font-bold text-[var(--text)]">Unassigned Loot / Rewards</h3>
      <p className="mt-1 text-xs text-[var(--text-soft)]">
        Clone an item from The Library into this campaign list. Assign it to a hero when they
        earn it — the sheet gets its own copy so Library edits never overwrite gear mid-game.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
          <span className="font-semibold">Clone from Library</span>
          <select
            value={cloneId}
            onChange={(e) => setCloneId(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <option value="">Choose an item…</option>
            {libraryPool.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({GAME_ITEM_KIND_LABEL[item.kind]})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-sm btn-accent"
          disabled={!cloneId || busy}
          onClick={() => void onCloneFromLibrary()}
        >
          Add to loot list
        </button>
      </div>

      {loot.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--text-soft)]">
          No staged loot yet. Clone an item from The Library to start a reward pile.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {loot.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded border px-2 py-2 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="min-w-0 flex-1 font-semibold text-[var(--text)]">
                {item.name}
                <span className="ml-1 font-normal text-[var(--text-soft)]">
                  {GAME_ITEM_KIND_LABEL[item.kind]}
                </span>
              </span>
              <select
                value={assignTarget[item.id] ?? ""}
                onChange={(e) =>
                  setAssignTarget((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                className="rounded border px-2 py-1"
                style={{ borderColor: "var(--border)", background: "var(--panel)" }}
                aria-label={`Assign ${item.name} to hero`}
              >
                <option value="">Assign to hero…</option>
                {(partyCharacters.length > 0 ? partyCharacters : characters).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.player.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={() => void onAssign(item.id)}
              >
                Give to hero
              </button>
            </li>
          ))}
        </ul>
      )}

      {status ? (
        <p className="mt-2 text-xs text-[var(--text-soft)]" role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
