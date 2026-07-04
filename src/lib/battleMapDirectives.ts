/**
 * Single source for user-visible and prompt fallbacks about battle-map style.
 */

export const SAMPLE_MAP_FORM_GRID_NOTES =
  "Strict **5 ft × 5 ft** tactical scale; **no printed grid lines**—clean illustrated floor plan (Virtual Table overlays the grid). Lighter walkable tones; walls clear. Label key rooms from context.";

export const AUTO_ADVENTURE_BATTLE_GRID_NOTES =
  "Strict **5 ft × 5 ft** tactical scale; **no printed grid** on the art—illustrated battlemat floors only; Virtual Table adds the grid. Short labels.";

export const AUTO_ADVENTURE_BATTLE_GRID_NOTES_METRIC =
  "Strict **1.5 m × 1.5 m** tactical scale; **no printed grid** on the art—illustrated battlemat floors only; Virtual Table adds the grid. Short labels.";

export const DEFAULT_BATTLE_GRID_NOTES_FALLBACK_METRIC =
  "Strict **1.5 m × 1.5 m** tactical scale; **illustrated floor plan without grid lines**—Virtual Table overlays the grid; encounter-scale zoom";

export const DEFAULT_BATTLE_GRID_NOTES_FALLBACK =
  "Strict 5 ft × 5 ft tactical scale; **illustrated floor plan without grid lines**—Virtual Table overlays the grid; encounter-scale zoom";

export const BATTLE_MAP_SCENE_PROMPT_LEAD =
  "Generate ONE top-down **illustrated battle map without printed grid lines** for miniature play: **5 ft × 5 ft** logical scale, **clear** wall/door/pit edges, **rich** floor materials—**orthogonal plan only**, not isometric. Virtual Table overlays the grid at play. Short labels for key areas from the scene.";

export const BATTLE_MAP_SCENE_PROMPT_LEAD_METRIC =
  "Generate ONE top-down **illustrated battle map without printed grid lines** for miniature play: **1.5 m × 1.5 m** logical scale, **clear** wall/door/pit edges, **rich** floor materials—**orthogonal plan only**, not isometric. Virtual Table overlays the grid at play. Short labels for key areas from the scene.";

/** Adventure doc: “short” length map briefs bullet (full line including leading `- **Maps:**`). */
export const ADVENTURE_MAP_RULE_SHORT_LINE = `- **Maps:** include one **locale / overland / world** map concept as a **rich full-color illustrated atlas** (distinct seas vs oceans vs large lakes, sharp coasts and borders, **terrain texture and relief**, **capitals** + **major cities**, **primary trade roads and sea lanes**) and 2-3 **encounter-scale** battle map concepts (one **tight tactical footprint** per brief—rooms/hall/clearing where the fight happens, not an entire site) as image-generation briefs for OpenAI (battle maps: top-down, **5 ft × 5 ft** tactical scale, **illustrated floor art without printed grid lines**—Virtual Table overlays the grid—isometric scenic scenes avoided). **Name key and iconic** regions, sites, rooms, and landmarks so generated map art can label them—**one** consistent name per place (no duplicate or synonymous labels for the same feature).`;

/** Adventure doc: “one_night” length map briefs bullet. */
export const ADVENTURE_MAP_RULE_ONE_NIGHT_LINE = `- **Maps:** one **full-color illustrated atlas-style** locale/world overview (clear water bodies, borders, **relief and biome detail**, **capital + major cities**, **major routes**) plus two **encounter-scale** battle map concepts (crop to the playable beat, not whole buildings or regions unless essential) for OpenAI image generation; battle briefs must state **5 ft × 5 ft** tactical scale, **illustrated floors without printed grid lines** (Virtual Table overlays the grid), zoomed for readable play spaces. **Name key and iconic** areas so map art can label them—**one** name per mappable place (no redundant synonyms).`;
