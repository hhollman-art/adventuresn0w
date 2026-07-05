import type { RealmSize } from "@/lib/realmPrompt";

export type MapDistanceUnits = "imperial" | "metric";

export function parseMapDistanceUnits(value: unknown): MapDistanceUnits {
  return String(value ?? "").trim().toLowerCase() === "metric"
    ? "metric"
    : "imperial";
}

/** Injected into map image prompts (locale vs battle). Reinforces scale-bar graphics for overland plates. */
const LOCALE_SCALE_BAR_RENDERING =
  "**Scale bar on sheet:** draw **one** horizontal graphic scale in a **quiet margin** (never buried in terrain)—**bold dark** bar shaft and ticks, **pale or white backing**, numerals + unit in **the same plain sans** as map text, **footer-large** and **high contrast**; **no** faint-only grays, **no** decorative frames, **no** overlap with title or compass art.";

export function mapDistanceUnitsPromptBlock(
  variant: "locale" | "battle",
  units: MapDistanceUnits,
): string {
  if (variant === "battle") {
    if (units === "metric") {
      return `**Map scale (metric):** tactical squares are **1.5 m × 1.5 m** (standard D&D-style metric grid). Any scale note on this plate uses **meters** for tactical distances.`;
    }
    return `**Map scale (imperial):** tactical squares are **5 ft × 5 ft** (D&D standard). Any tactical scale note uses **feet** (not meters).`;
  }
  if (units === "metric") {
    return `**Map scale (metric):** the **scale bar** and all distance labels use **kilometers** (or **Mm** at planetary scale where appropriate). **Do not** use miles or leagues as the primary unit.\n${LOCALE_SCALE_BAR_RENDERING}`;
  }
  return `**Map scale (imperial):** the **scale bar** and distance labels use **miles** and/or **leagues** (fantasy-appropriate). **Do not** use kilometers as the primary unit.\n${LOCALE_SCALE_BAR_RENDERING}`;
}

/** Scale-bar copy for realm cartography prompt (margin legend). */
export function realmScaleLegendForSize(
  realmSize: RealmSize,
  units: MapDistanceUnits,
): string {
  if (units === "metric") {
    switch (realmSize) {
      case "world":
        return "Include a **scale bar** in a free margin with ticks and a label in **thousands of kilometers** (or **Mm**) suited to a world or plane chart—**clean graphic bar**: dark ticks, pale margin, **legible sans** numbers (see scale-bar rules in prompt).";
      case "continent":
        return "Include a **scale bar** in a margin labeled in **hundreds of kilometers** (or thousands of km for very large continents)—**simple high-contrast** bar, **not** faint micro-type.";
      case "country":
        return "Include a **scale bar** in a corner margin labeled in **kilometers** for a kingdom- or country-scale map—**bold** bar/ticks, **readable** unit text.";
      case "region":
        return "Include a **scale bar** in a margin labeled in **kilometers** for a province, duchy, or march—**clear sans** labeling, margin-only.";
      case "city":
        return "Include a **scale bar** in a margin labeled in **kilometers** (or **hundreds of meters** for a dense core map) for a city or metropolis—**clean** footer-style legend.";
      case "local":
      default:
        return "Include a **scale bar** in a margin labeled in **kilometers** for a district or cluster of sites—**clean** footer-style legend.";
    }
  }
  switch (realmSize) {
    case "world":
      return "Include a **scale bar** in a free margin (e.g. lower edge): tick marks and a label in **thousands of miles** or long **leagues** suited to a world chart—**clean technical bar**, **footer-sized** sans numerals, **high contrast** on pale margin.";
    case "continent":
      return "Include a **scale bar** in a margin with ticks and a label in **hundreds of miles** or long **leagues** matching a subcontinental map—**bold** strokes, **readable** unit line.";
    case "country":
      return "Include a **scale bar** in a corner margin labeled in **miles** or **leagues** for a kingdom- or country-scale map—**simple** graphic, **no** micro-print.";
    case "region":
      return "Include a **scale bar** in a margin labeled in **miles** (or a plausible regional unit) for a province or march—**plain sans** numbers.";
    case "city":
      return "Include a **scale bar** in a margin labeled in **miles** (or **city blocks** for a dense core map) for an urban setting—**clear** bar and text.";
    case "local":
    default:
      return "Include a **scale bar** in a margin labeled in **miles** (or a short local unit) for a valley, district, or cluster of sites—**clear** bar and text.";
  }
}
