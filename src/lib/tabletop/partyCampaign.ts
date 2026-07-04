import type { PlayerCharacter, TabletopSession } from "./types";
import { effectiveMaxHp } from "./character";
import {
  getSavedCharacterRoster,
  loadSavedCharacterRosters,
  saveCharacterRoster,
  updateCharacterRoster,
  type SavedCharacterRoster,
} from "./characterRoster";
import { newId } from "./session";

export type PartyImportRequest = {
  rosterId: string;
  placeTokens: boolean;
  /** Link this roster as the active campaign party (stable ids for save-back). */
  linkCampaign: boolean;
  /** Replace the current VTT party instead of appending. */
  replaceExisting: boolean;
};

export const PENDING_PARTY_IMPORT_KEY = "ddeasy-pending-party-import";

export function queuePartyImport(request: PartyImportRequest): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_PARTY_IMPORT_KEY, JSON.stringify(request));
}

export function consumePendingPartyImport(): PartyImportRequest | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_PARTY_IMPORT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_PARTY_IMPORT_KEY);
  try {
    const parsed = JSON.parse(raw) as PartyImportRequest;
    if (typeof parsed.rosterId !== "string") return null;
    return {
      rosterId: parsed.rosterId,
      placeTokens: parsed.placeTokens === true,
      linkCampaign: parsed.linkCampaign === true,
      replaceExisting: parsed.replaceExisting !== false,
    };
  } catch {
    return null;
  }
}

/** Capture live VTT sheets + token HP for saving back to the party library. */
export function snapshotPlayersForRoster(session: TabletopSession): PlayerCharacter[] {
  return session.players.map((p) => {
    const token = p.tokenId ? session.tokens.find((t) => t.id === p.tokenId) : null;
    const currentHp = token?.hp?.current ?? p.currentHp ?? null;
    return {
      ...p,
      tokenId: null,
      currentHp,
      items: p.items.map((item) => ({ ...item })),
    };
  });
}

function tokenHpForPlayer(player: PlayerCharacter): { current: number; max: number } {
  const max = effectiveMaxHp(player);
  const current =
    player.currentHp != null ? Math.min(Math.max(0, player.currentHp), max) : max;
  return { current, max };
}

/** Save or update the linked campaign party from the live VTT session. */
export async function savePartyFromSession(
  session: TabletopSession,
  options: { name?: string; notes?: string } = {},
): Promise<{ rosters: SavedCharacterRoster[]; roster: SavedCharacterRoster | null }> {
  const players = snapshotPlayersForRoster(session);
  if (players.length === 0) {
    return { rosters: await loadSavedCharacterRosters(), roster: null };
  }

  const rosterId = session.activePartyId;
  if (rosterId) {
    const existing = await getSavedCharacterRoster(rosterId);
    if (existing) {
      const rosters = await updateCharacterRoster(rosterId, {
        name: options.name ?? existing.name,
        notes: options.notes ?? existing.notes,
        players,
        source: "vtt",
      });
      return { rosters, roster: rosters.find((r) => r.id === rosterId) ?? null };
    }
  }

  const name =
    options.name?.trim() ||
    (players.length === 1 ? players[0].name : `Campaign party (${players.length})`);
  const rosters = await saveCharacterRoster({
    name,
    notes: options.notes ?? "",
    markdown: "",
    source: "vtt",
    players,
  });
  return { rosters, roster: rosters[0] ?? null };
}

export type NewPlayerTokenFn = (
  session: TabletopSession,
  player: PlayerCharacter,
  tokenId: string,
) => import("./types").TabletopToken;

/** Load a saved roster onto the VTT, optionally linking it for campaign save-back. */
export function applyPartyImport(
  session: TabletopSession,
  roster: SavedCharacterRoster,
  options: Pick<PartyImportRequest, "placeTokens" | "linkCampaign" | "replaceExisting">,
  newPlayerToken: NewPlayerTokenFn,
): TabletopSession {
  const keepIds = options.linkCampaign;
  const imported: PlayerCharacter[] = roster.players.map((p) => ({
    ...p,
    id: keepIds ? p.id : newId(),
    tokenId: null,
    items: p.items.map((item) => ({
      ...item,
      id: keepIds ? item.id : newId(),
    })),
  }));

  let tokens = options.replaceExisting
    ? session.tokens.filter(
        (t) => !session.players.some((p) => p.tokenId === t.id && p.tokenId !== null),
      )
    : [...session.tokens];
  let players = options.replaceExisting ? [] : [...session.players];

  if (options.placeTokens) {
    for (const player of imported) {
      const tokenId = newId();
      const linked = { ...player, tokenId };
      const token = newPlayerToken({ ...session, tokens, players }, linked, tokenId);
      const hp = tokenHpForPlayer(player);
      tokens = [...tokens, { ...token, hp }];
      players = [...players, linked];
    }
  } else {
    players = [...players, ...imported];
  }

  return {
    ...session,
    activePartyId: options.linkCampaign ? roster.id : session.activePartyId,
    players,
    tokens,
  };
}

export function formatPartyUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
