import type { AbilityScores, PlayerCharacter } from "./types";

/**
 * Serializes characters to the portable Markdown format that
 * `parseCharactersMarkdown` reads back. One character = one self-contained
 * `.md` file that can be loaded anywhere characters are accepted: Add party,
 * the Virtual Table, or adventure prep.
 */

type CharacterLike = Omit<PlayerCharacter, "tokenId"> & { tokenId?: string | null };

function abilityLine(abilities: AbilityScores): string {
  return `STR ${abilities.str}, DEX ${abilities.dex}, CON ${abilities.con}, INT ${abilities.int}, WIS ${abilities.wis}, CHA ${abilities.cha}`;
}

/** `### Name — Class (Level N)` block plus labeled bullets the parser picks up. */
export function characterToMarkdownBlock(player: CharacterLike): string {
  const heading = `### ${player.name}${player.className ? ` — ${player.className}` : ""} (Level ${player.level})`;
  const lines = [heading];
  if (player.playerName) lines.push(`- Player: ${player.playerName}`);
  if (player.species) lines.push(`- Race: ${player.species}`);
  if (player.subclass) lines.push(`- Subclass: ${player.subclass}`);
  if (player.background) lines.push(`- Background: ${player.background}`);
  if (player.alignment) lines.push(`- Alignment: ${player.alignment}`);
  lines.push(`- AC: ${player.ac}`);
  lines.push(`- HP: ${player.maxHp}`);
  lines.push(`- Speed: ${player.speed}`);
  lines.push(`- ${abilityLine(player.abilities)}`);
  for (const item of player.items) {
    lines.push(`- Gear: ${item.name}${item.notes ? ` — ${item.notes}` : ""}`);
  }
  if (player.notes.trim()) {
    for (const note of player.notes.split("\n")) {
      const t = note.trim();
      if (t) lines.push(`- ${t}`);
    }
  }
  return lines.join("\n");
}

/** Full party document: `# Name`, `## Characters`, one block per PC. */
export function rosterToMarkdown(rosterName: string, players: CharacterLike[]): string {
  const blocks = players.map(characterToMarkdownBlock);
  return `# ${rosterName}\n\n## Characters\n\n${blocks.join("\n\n")}\n`;
}

/** Standalone single-character file — loads back as a one-character party. */
export function characterToMarkdownFile(player: CharacterLike): string {
  return rosterToMarkdown(player.name, [player]);
}

/** Safe cross-platform file slug: "Aria Windrunner" → "aria-windrunner". */
export function fileSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "character";
}

/** e.g. "aria-windrunner.md" */
export function characterFileName(player: CharacterLike): string {
  return `${fileSlug(player.name)}.md`;
}
