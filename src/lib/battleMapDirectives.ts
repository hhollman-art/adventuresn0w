/**
 * Single source for user-visible and prompt fallbacks about battle-map style.
 */

export const SAMPLE_MAP_FORM_GRID_NOTES =
  "Strict **5 ft × 5 ft**; **graph-paper-style diagram** for miniatures—flat schematic linework, light paper, **not** a painted scene; tiny hand-ink OK if grid wins. Tight encounter zoom (~12–22 cells on short side). Dark bold grid; lighter floors. Label key rooms from context.";

export const AUTO_ADVENTURE_BATTLE_GRID_NOTES =
  "Strict **5 ft × 5 ft**; **diagram on graph paper** energy—schematic for minis, **not** illustrative set dressing. Dark bold grid; light flat fills. Keep rooms/obvious. Short labels.";

export const DEFAULT_BATTLE_GRID_NOTES_FALLBACK =
  "Strict 5 ft × 5 ft squares; **graph-paper / floor-plan diagram** for miniature play—not a painted scene; minor hand-ink OK; bold visible grid; encounter-scale zoom";

export const BATTLE_MAP_SCENE_PROMPT_LEAD =
  "Generate ONE top-down **graph-paper / floor-plan battle diagram** for miniature play (not scenic illustration): **flat schematic** walls and features, light paper, **dominant grid**. Roughly 12–22 cells on the shorter side; strict **5 ft × 5 ft** uniform squares. **No** cinematic lighting or painterly atmosphere—minor hand-ink character OK if it never obscures squares. Short labels for key areas from the scene.";

/** Adventure doc: “short” length map briefs bullet (full line including leading `- **Maps:**`). */
export const ADVENTURE_MAP_RULE_SHORT_LINE = `- **Maps:** include one locale map concept and 2-3 **encounter-scale** battle map concepts (one **tight tactical footprint** per brief—rooms/hall/clearing where the fight happens, not an entire site) as image-generation briefs for OpenAI (top-down, **strict 5 ft × 5 ft** grid, **graph-paper / diagram** style prioritized over illustration for battle maps, **highly visible** grid). **Name key and iconic** regions, sites, rooms, and landmarks so generated map art can label them—**one** consistent name per place (no duplicate or synonymous labels for the same feature).`;

/** Adventure doc: “one_night” length map briefs bullet. */
export const ADVENTURE_MAP_RULE_ONE_NIGHT_LINE = `- **Maps:** one tight locale map concept plus two **encounter-scale** battle map concepts (crop to the playable beat, not whole buildings or regions unless essential) for OpenAI image generation; briefs must state **5 ft × 5 ft** tactical squares (uniform), **diagram / graph-paper** clarity over painterly art for battle maps, zoomed for **large readable cells**, and **bold easy-to-see grid**. **Name key and iconic** areas so map art can label them—**one** name per mappable place (no redundant synonyms).`;
