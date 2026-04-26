export type AdventureSceneSnippet = {
  title: string;
  /** Markdown chunk for map/prop prompts (heading + body). */
  context: string;
};

/** Cap per adventure to limit OpenAI image API cost and time. */
export const MAX_AUTO_SCENE_IMAGES = 5;

function normalizeH2(line: string): string | null {
  const t = line.trim();
  if (!t.startsWith("## ")) return null;
  return t.slice(3).trim().toLowerCase();
}

function isPlaySectionH2(key: string): boolean {
  if (
    key.includes("not for players") ||
    key.includes("gm only") ||
    key.includes("behind the screen")
  ) {
    return false;
  }

  return (
    key.startsWith("locations / scenes") ||
    key.startsWith("the night") ||
    key.startsWith("session 1") ||
    key.startsWith("session adventures") ||
    key.startsWith("adventure flow") ||
    key.startsWith("scene flow") ||
    key.startsWith("scene breakdown") ||
    key.startsWith("adventure beats") ||
    key.startsWith("acts / scenes") ||
    key.startsWith("acts and scenes") ||
    key.startsWith("encounters") ||
    key.startsWith("chapters") ||
    key.startsWith("timeline") ||
    /^session\s+\d+/.test(key)
  );
}

/**
 * Pulls `###` scene chapters from playable sections (locations, one-nighter night,
 * Session 1, numbered session outlines). Used to drive one battle map + one prop per scene.
 */
export function extractAdventureScenes(
  markdown: string,
  maxScenes: number = MAX_AUTO_SCENE_IMAGES,
): AdventureSceneSnippet[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: AdventureSceneSnippet[] = [];
  let inPlay = false;
  let current: { title: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (body.length >= 40 && current.title.length > 0) {
      out.push({
        title: current.title,
        context: [`### ${current.title}`, body].join("\n"),
      });
    }
    current = null;
  };

  for (const line of lines) {
    const h2 = normalizeH2(line);
    if (h2 !== null) {
      flush();
      inPlay = isPlaySectionH2(h2);
      continue;
    }

    if (!inPlay) continue;

    const t = line.trim();
    if (t.startsWith("### ")) {
      flush();
      current = { title: t.slice(4).trim(), lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  flush();
  if (out.length > 0) {
    return out.slice(0, maxScenes);
  }

  // Fallback: some generations use `###` scene headings without the expected H2 wrappers.
  // Capture globally, but avoid setup/meta sections that aren't battle-map moments.
  const fallback: AdventureSceneSnippet[] = [];
  let active: { title: string; lines: string[] } | null = null;
  let blockedSection = false;

  const flushFallback = () => {
    if (!active) return;
    const body = active.lines.join("\n").trim();
    if (body.length >= 40 && active.title.length > 0) {
      fallback.push({
        title: active.title,
        context: [`### ${active.title}`, body].join("\n"),
      });
    }
    active = null;
  };

  for (const line of lines) {
    const h2 = normalizeH2(line);
    if (h2 !== null) {
      flushFallback();
      blockedSection =
        h2.includes("hooks") ||
        h2.includes("secrets") ||
        h2.includes("treasure") ||
        h2.includes("rewards") ||
        h2.includes("safety") ||
        h2.includes("session recap") ||
        h2.includes("gm prep");
      continue;
    }

    if (blockedSection) continue;
    const t = line.trim();
    if (t.startsWith("### ")) {
      flushFallback();
      active = { title: t.slice(4).trim(), lines: [] };
      continue;
    }
    if (active) {
      active.lines.push(line);
    }
  }
  flushFallback();
  return fallback.slice(0, maxScenes);
}
