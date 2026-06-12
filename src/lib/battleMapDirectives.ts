/**
 * Single source for user-visible and prompt fallbacks about battle-map style.
 */

export const SAMPLE_MAP_FORM_GRID_NOTES =
  "Strict **5 ft × 5 ft**; **graph-paper base** with an **illustrated tactical diagram**—rich floor/terrain ink and color, light paper, **dominant bold grid**. Tight encounter zoom (~12–22 cells on short side). Lighter walkable tones; walls clear. Label key rooms from context.";

export const AUTO_ADVENTURE_BATTLE_GRID_NOTES =
  "Strict **5 ft × 5 ft**; **graph-paper / illustrated battlemat**—grid-first for minis, **welcomes** painted floors, rubble, water, props; **no** isometric staging. Dark bold grid; short labels.";

export const AUTO_ADVENTURE_BATTLE_GRID_NOTES_METRIC =
  "Strict **1.5 m × 1.5 m**; **graph-paper / illustrated battlemat**—grid-first for minis, **welcomes** painted floors, rubble, water, props; **no** isometric staging. Dark bold grid; short labels.";

export const DEFAULT_BATTLE_GRID_NOTES_FALLBACK_METRIC =
  "Strict **1.5 m × 1.5 m** squares; **graph-paper floor plan** with **illustrated** stone/earth/water/detail—grid **must** stay obvious; encounter-scale zoom";

export const DEFAULT_BATTLE_GRID_NOTES_FALLBACK =
  "Strict 5 ft × 5 ft squares; **graph-paper floor plan** with **illustrated** stone/earth/water/detail—grid **must** stay obvious; encounter-scale zoom";

export const BATTLE_MAP_SCENE_PROMPT_LEAD =
  "Generate ONE top-down **illustrated graph-paper battle map** for miniature play: **dominant** uniform **5 ft × 5 ft** grid on light paper, **clear** wall/door/pit edges, **rich** floor materials and environment paint (rubble, pools, roots, furniture silhouettes)—**orthogonal plan only**, not isometric. Roughly 12–22 cells on the shorter side. **No** cinematic spotlighting or cast shadows that break cell readability. Short labels for key areas from the scene.";

export const BATTLE_MAP_SCENE_PROMPT_LEAD_METRIC =
  "Generate ONE top-down **illustrated graph-paper battle map** for miniature play: **dominant** uniform **1.5 m × 1.5 m** grid on light paper, **clear** wall/door/pit edges, **rich** floor materials and environment paint (rubble, pools, roots, furniture silhouettes)—**orthogonal plan only**, not isometric. Roughly 12–22 cells on the shorter side. **No** cinematic spotlighting or cast shadows that break cell readability. Short labels for key areas from the scene.";

/** Adventure doc: “short” length map briefs bullet (full line including leading `- **Maps:**`). */
export const ADVENTURE_MAP_RULE_SHORT_LINE = `- **Maps:** include one **locale / overland / world** map concept as a **rich full-color illustrated atlas** (distinct seas vs oceans vs large lakes, sharp coasts and borders, **terrain texture and relief**, **capitals** + **major cities**, **primary trade roads and sea lanes**) and 2-3 **encounter-scale** battle map concepts (one **tight tactical footprint** per brief—rooms/hall/clearing where the fight happens, not an entire site) as image-generation briefs for OpenAI (battle maps: top-down, **strict 5 ft × 5 ft** grid, **illuminated graph-paper / illustrated battlemat**, **highly visible** grid—isometric scenic scenes avoided). **Name key and iconic** regions, sites, rooms, and landmarks so generated map art can label them—**one** consistent name per place (no duplicate or synonymous labels for the same feature).`;

/** Adventure doc: “one_night” length map briefs bullet. */
export const ADVENTURE_MAP_RULE_ONE_NIGHT_LINE = `- **Maps:** one **full-color illustrated atlas-style** locale/world overview (clear water bodies, borders, **relief and biome detail**, **capital + major cities**, **major routes**) plus two **encounter-scale** battle map concepts (crop to the playable beat, not whole buildings or regions unless essential) for OpenAI image generation; battle briefs must state **5 ft × 5 ft** tactical squares (uniform), **grid-first illustrated** floors (materials, rubble, water) with **bold easy-to-see grid**, zoomed for **large readable cells**. **Name key and iconic** areas so map art can label them—**one** name per mappable place (no redundant synonyms).`;
