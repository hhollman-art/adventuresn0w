import type { DiceLogEntry, PlayerCharacter, TabletopSession } from "@/lib/tabletop/types";
import { newId } from "@/lib/tabletop/session";

/** Lightweight mutation events — players send these; DM host applies to master state. */
export type TabletopMutation =
  | PlayerRollMutation
  | PlayerHpDeltaMutation
  | PlayerCastSpellMutation
  | PlayerUpdateNotesMutation
  | DmFullStateSyncMutation;

export type MutationEnvelope = {
  /** Monotonic per-room revision the client last observed. */
  baseRevision: number;
  mutation: TabletopMutation;
};

export type PlayerRollMutation = {
  type: "PLAYER_ROLL";
  seatId: string;
  expression: string;
  /** Optional flavor label shown in the dice log. */
  label?: string;
};

export type PlayerHpDeltaMutation = {
  type: "PLAYER_HP_DELTA";
  seatId: string;
  characterId: string;
  delta: number;
};

export type PlayerCastSpellMutation = {
  type: "PLAYER_CAST_SPELL";
  seatId: string;
  characterId: string;
  spellId: string;
};

export type PlayerUpdateNotesMutation = {
  type: "PLAYER_UPDATE_NOTES";
  seatId: string;
  characterId: string;
  notes: string;
};

/** DM-only: replace master state (local tab or relay host). */
export type DmFullStateSyncMutation = {
  type: "DM_STATE_SYNC";
  dmId: string;
  state: TabletopSession;
};

export type MutationApplyResult =
  | { ok: true; revision: number; session: TabletopSession; logEntry?: DiceLogEntry }
  | { ok: false; reason: "stale_revision" | "forbidden" | "invalid" | "not_found" };

function findPlayerCharacter(
  session: TabletopSession,
  characterId: string,
): PlayerCharacter | null {
  return session.players.find((p) => p.id === characterId) ?? null;
}

function appendPlayerLog(
  session: TabletopSession,
  entry: Omit<DiceLogEntry, "id" | "at">,
): TabletopSession {
  const logEntry: DiceLogEntry = {
    id: newId(),
    at: new Date().toISOString(),
    ...entry,
  };
  return {
    ...session,
    updatedAt: logEntry.at,
    log: [logEntry, ...session.log].slice(0, 60),
  };
}

/**
 * Apply one player/DM mutation to the master session.
 * Pure reducer — safe to unit test without network.
 */
export function applyTabletopMutation(
  session: TabletopSession,
  mutation: TabletopMutation,
): MutationApplyResult {
  switch (mutation.type) {
    case "PLAYER_ROLL": {
      const total = rollExpression(mutation.expression);
      const updated = appendPlayerLog(session, {
        expression: mutation.expression,
        detail: mutation.label ?? mutation.expression,
        total,
        secret: false,
      });
      return { ok: true, revision: 0, session: updated };
    }
    case "PLAYER_HP_DELTA": {
      const player = findPlayerCharacter(session, mutation.characterId);
      if (!player) return { ok: false, reason: "not_found" };
      const maxHp = player.maxHp;
      const current = player.currentHp ?? maxHp;
      const nextHp = Math.max(0, Math.min(maxHp, current + mutation.delta));
      const players = session.players.map((p) =>
        p.id === mutation.characterId ? { ...p, currentHp: nextHp } : p,
      );
      return {
        ok: true,
        revision: 0,
        session: { ...session, players, updatedAt: new Date().toISOString() },
      };
    }
    case "PLAYER_CAST_SPELL": {
      const player = findPlayerCharacter(session, mutation.characterId);
      if (!player) return { ok: false, reason: "not_found" };
      const updated = appendPlayerLog(session, {
        expression: "spell",
        detail: `${player.name} casts ${mutation.spellId}`,
        total: 0,
        secret: false,
      });
      return { ok: true, revision: 0, session: updated };
    }
    case "PLAYER_UPDATE_NOTES": {
      const player = findPlayerCharacter(session, mutation.characterId);
      if (!player) return { ok: false, reason: "not_found" };
      const players = session.players.map((p) =>
        p.id === mutation.characterId ? { ...p, notes: mutation.notes } : p,
      );
      return {
        ok: true,
        revision: 0,
        session: { ...session, players, updatedAt: new Date().toISOString() },
      };
    }
    case "DM_STATE_SYNC":
      return {
        ok: true,
        revision: 0,
        session: { ...mutation.state, updatedAt: new Date().toISOString() },
      };
    default:
      return { ok: false, reason: "invalid" };
  }
}

/** Minimal dice roller for PLAYER_ROLL — extend with full parser later. */
function rollExpression(expression: string): number {
  const match = expression.match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!match) return Math.floor(Math.random() * 20) + 1;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const mod = match[3] ? Number(match[3]) : 0;
  let sum = mod;
  for (let i = 0; i < count; i += 1) {
    sum += Math.floor(Math.random() * sides) + 1;
  }
  return sum;
}
