export type DiceRollResult = {
  expression: string;
  /** Human-readable breakdown, e.g. "2d6 [4, 2] + 3". */
  detail: string;
  total: number;
};

type Term =
  | { kind: "dice"; sign: 1 | -1; count: number; sides: number }
  | { kind: "flat"; sign: 1 | -1; value: number };

const MAX_DICE = 100;
const MAX_SIDES = 1000;

/**
 * Parses expressions like "2d6+3", "d20", "1d8 + 2d4 - 1".
 * Returns null when the expression is invalid.
 */
export function parseDiceExpression(raw: string): Term[] | null {
  const compact = raw.replace(/\s+/g, "").toLowerCase();
  if (!compact) return null;

  const terms: Term[] = [];
  // Split into signed segments: +2d6, -1, +d20 ...
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/gy;
  let index = 0;
  while (index < compact.length) {
    re.lastIndex = index;
    const m = re.exec(compact);
    if (!m || m.index !== index) return null;
    if (m[3] !== undefined) {
      const sign: 1 | -1 = m[1] === "-" ? -1 : 1;
      const count = m[2] ? Number(m[2]) : 1;
      const sides = Number(m[3]);
      if (count < 1 || count > MAX_DICE || sides < 2 || sides > MAX_SIDES) return null;
      terms.push({ kind: "dice", sign, count, sides });
    } else {
      const sign: 1 | -1 = m[4] === "-" ? -1 : 1;
      const value = Number(m[5]);
      terms.push({ kind: "flat", sign, value });
    }
    index = re.lastIndex;
  }
  if (terms.length === 0) return null;
  // First term may omit its sign; subsequent terms must carry one, which the
  // sticky regex already enforces because segments are only separated by +/-.
  return terms;
}

export function rollDice(
  raw: string,
  random: () => number = Math.random,
): DiceRollResult | null {
  const terms = parseDiceExpression(raw);
  if (!terms) return null;

  let total = 0;
  const parts: string[] = [];
  for (const term of terms) {
    const signText = parts.length === 0 ? (term.sign < 0 ? "-" : "") : term.sign < 0 ? " - " : " + ";
    if (term.kind === "flat") {
      total += term.sign * term.value;
      parts.push(`${signText}${term.value}`);
    } else {
      const rolls: number[] = [];
      for (let i = 0; i < term.count; i += 1) {
        rolls.push(1 + Math.floor(random() * term.sides));
      }
      const subtotal = rolls.reduce((a, b) => a + b, 0);
      total += term.sign * subtotal;
      parts.push(`${signText}${term.count}d${term.sides} [${rolls.join(", ")}]`);
    }
  }

  return {
    expression: normalizeExpression(terms),
    detail: parts.join(""),
    total,
  };
}

function normalizeExpression(terms: Term[]): string {
  return terms
    .map((t, i) => {
      const sign = i === 0 ? (t.sign < 0 ? "-" : "") : t.sign < 0 ? " - " : " + ";
      return t.kind === "dice" ? `${sign}${t.count}d${t.sides}` : `${sign}${t.value}`;
    })
    .join("");
}
