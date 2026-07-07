/** Optional advanced guidance shown in rich fantasy tooltips. */
export const DM_TIPS = {
  welcome: "Use the hearth when you want the big picture — jump to a workspace when you know your next task.",
  library:
    "Filter by shelf first, then by kind. Active campaign scoping hides unrelated prep without deleting anything.",
  campaigns:
    "Link by id, never copy — the same realm seed can serve multiple chronicles without duplication.",
  realm: "Write place names and tensions in plain words; generators treat your CF as ground truth.",
  adventure: "Start manual with a hook CF, then let AI expand only the sections you still need.",
  maps: "Name the scale in your CF (room, village, region) so the map generator picks the right zoom.",
  tavern: "Build one hero sheet at a time, then assemble a fellowship — deleting a party never deletes heroes.",
  items: "Copy gear from your library onto sheets; SRD gear stays read-only in the bundled catalogue.",
  virtualTable: "Shelve the table when switching campaigns — each chronicle keeps its own battle map state.",
  quickNpc: "Full NPC records are coming soon — for now, draft allies and villains as hero sheets or story CFs.",
  quickItem: "Magic items can carry attunement and rarity on the Items workplace before you add them to a sheet.",
  quickLocation: "Realm CFs hold towns and regions; map CFs hold battle grids for a specific site.",
  quickQuest: "Adventure CFs are story hooks; prepared scrolls are finished pages ready to print or copy.",
} as const;

export type DmTipKey = keyof typeof DM_TIPS;

export function dmTip(key: DmTipKey): string {
  return DM_TIPS[key];
}
