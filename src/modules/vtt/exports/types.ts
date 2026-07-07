/** Shared metadata stamped on every DMMS → VTT export. */
export type DmmsVttExportMeta = {
  source: "ddeasy";
  version: 1;
  exportedAt: string;
  /** Human-readable platform target for import instructions. */
  platform: "foundry" | "roll20";
  system: "dnd5e";
};

export type FoundryExportBundle<T> = {
  meta: DmmsVttExportMeta;
  data: T;
};
