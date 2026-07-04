import { describe, expect, it } from "vitest";
import { createDefaultSession } from "./session";
import { applyPartyImport, snapshotPlayersForRoster } from "./partyCampaign";
import type { SavedCharacterRoster } from "./characterRoster";
import type { TabletopToken } from "./types";

const roster: SavedCharacterRoster = {
  id: "roster-1",
  name: "Test party",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  source: "workshop",
  notes: "Session 3 complete",
  markdown: "",
  players: [
    {
      id: "pc-1",
      name: "Aria",
      playerName: "Sam",
      species: "Elf",
      className: "Wizard",
      subclass: "",
      background: "Sage",
      alignment: "Neutral Good",
      level: 4,
      abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
      ac: 13,
      maxHp: 24,
      speed: 30,
      notes: "Knows fire bolt",
      items: [{ id: "i1", name: "Cloak of protection", notes: "", bonuses: { ac: 1, maxHp: 0, speed: 0, initiative: 0, passivePerception: 0, str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }],
      currentHp: 18,
      tokenId: null,
    },
  ],
};

function stubToken(): TabletopToken {
  return {
    id: "tok",
    label: "Aria",
    color: "#2563eb",
    kind: "pc",
    x: 0,
    y: 0,
    size: 1,
    hp: { current: 18, max: 24 },
    hidden: false,
    imageDataUrl: null,
  };
}

describe("snapshotPlayersForRoster", () => {
  it("captures token current HP and strips token links", () => {
    const session = createDefaultSession();
    session.players = [{ ...roster.players[0], tokenId: "tok-1" }];
    session.tokens = [{ ...stubToken(), id: "tok-1", hp: { current: 11, max: 24 } }];

    const snap = snapshotPlayersForRoster(session);
    expect(snap[0].currentHp).toBe(11);
    expect(snap[0].tokenId).toBeNull();
    expect(snap[0].level).toBe(4);
    expect(snap[0].items).toHaveLength(1);
  });
});

describe("applyPartyImport", () => {
  it("links campaign ids and restores saved HP on tokens", () => {
    const session = createDefaultSession();
    const next = applyPartyImport(
      session,
      roster,
      { placeTokens: true, linkCampaign: true, replaceExisting: true },
      (_s, player, tokenId) => ({ ...stubToken(), id: tokenId, label: player.name }),
    );

    expect(next.activePartyId).toBe("roster-1");
    expect(next.players).toHaveLength(1);
    expect(next.players[0].id).toBe("pc-1");
    expect(next.players[0].tokenId).toBeTruthy();
    expect(next.tokens[0].hp).toEqual({ current: 18, max: 24 });
  });
});
