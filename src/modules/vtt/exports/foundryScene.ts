import { CELL_PX, tokenCellFootprint } from "@/lib/tabletop/gridScale";
import type { TabletopSession, TabletopToken, TokenKind } from "@/lib/tabletop/types";
import type { FoundryExportBundle } from "./types";
import { exportFileSlug } from "./download";

/** Foundry scene document — import via Scenes directory → Import Data. */
export type FoundrySceneExport = {
  name: string;
  navigation: boolean;
  navOrder: number;
  navName: string;
  background: {
    src: string;
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    anchorX: number;
    anchorY: number;
  };
  foreground: string;
  foregroundElevation: number;
  thumb: string | null;
  width: number;
  height: number;
  padding: number;
  initial: { x: number; y: number; scale: number };
  backgroundColor: string;
  grid: {
    type: 1;
    size: number;
    distance: number;
    units: "ft";
    color: string;
    alpha: number;
  };
  tokenVision: boolean;
  fogExploration: boolean;
  globalLight: boolean;
  darkness: number;
  flags: {
    ddeasy: {
      mapName: string;
      exportedAt: string;
      mapImageFile: string | null;
      gridCols: number;
      gridRows: number;
    };
  };
  walls: [];
  lights: [];
  notes: [];
  sounds: [];
  regions: [];
  drawings: [];
  tokens: FoundrySceneTokenExport[];
};

export type FoundrySceneTokenExport = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  lockRotation: boolean;
  rotation: number;
  alpha: number;
  disposition: -1 | 0 | 1;
  displayName: 0 | 30 | 50;
  hidden: boolean;
  texture: { src: string };
  actorLink: boolean;
  actorData: Record<string, never>;
  flags: {
    ddeasy: {
      tokenId: string;
      kind: TokenKind;
      gridX: number;
      gridY: number;
    };
  };
};

const TOKEN_DISPOSITION: Record<TokenKind, -1 | 0 | 1> = {
  pc: 1,
  ally: 1,
  monster: -1,
  object: 0,
};

function tokenToFoundryExport(
  token: TabletopToken,
  feetPerCell: number,
  gridSize: number,
): FoundrySceneTokenExport {
  const footprint = tokenCellFootprint(token.size, feetPerCell);
  const centerX = (token.x + footprint / 2) * gridSize;
  const centerY = (token.y + footprint / 2) * gridSize;
  const cellSpan = Math.max(1, Math.round(footprint));

  return {
    name: token.label,
    x: centerX,
    y: centerY,
    width: cellSpan,
    height: cellSpan,
    scale: 1,
    lockRotation: false,
    rotation: 0,
    alpha: token.hidden ? 0.5 : 1,
    disposition: TOKEN_DISPOSITION[token.kind],
    displayName: 0,
    hidden: token.hidden,
    texture: { src: "icons/svg/mystery-man.svg" },
    actorLink: false,
    actorData: {},
    flags: {
      ddeasy: {
        tokenId: token.id,
        kind: token.kind,
        gridX: token.x,
        gridY: token.y,
      },
    },
  };
}

export type FoundrySceneBundle = FoundryExportBundle<FoundrySceneExport> & {
  /** Companion PNG filename when a map image was present at export time. */
  mapImageFilename: string | null;
  importNotes: string;
};

/**
 * Convert a Virtual Table session into a Foundry scene JSON bundle.
 * Map art is exported as a separate PNG — Foundry cannot embed data URLs in scene imports.
 */
export function exportFoundrySceneFromSession(session: TabletopSession): FoundrySceneBundle {
  const cols = session.mapGridCols || session.grid.cols;
  const rows = session.mapGridRows || session.grid.rows;
  const gridSize = CELL_PX;
  const width = cols * gridSize;
  const height = rows * gridSize;
  const slug = exportFileSlug(session.mapName, "scene");
  const mapImageFilename = session.mapImageDataUrl ? `${slug}-map.png` : null;
  const exportedAt = new Date().toISOString();

  const scene: FoundrySceneExport = {
    name: session.mapName || "DMMS Scene",
    navigation: true,
    navOrder: 0,
    navName: session.mapName || "DMMS Scene",
    background: {
      src: mapImageFilename ? `maps/${mapImageFilename}` : "",
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      anchorX: 0,
      anchorY: 0,
    },
    foreground: "",
    foregroundElevation: 20,
    thumb: null,
    width,
    height,
    padding: 0.25,
    initial: { x: width / 2, y: height / 2, scale: 1 },
    backgroundColor: "#000000",
    grid: {
      type: 1,
      size: gridSize,
      distance: session.grid.feetPerCell,
      units: "ft",
      color: "#000000",
      alpha: 0.2,
    },
    tokenVision: true,
    fogExploration: session.fog.enabled,
    globalLight: false,
    darkness: 0,
    flags: {
      ddeasy: {
        mapName: session.mapName,
        exportedAt,
        mapImageFile: mapImageFilename,
        gridCols: cols,
        gridRows: rows,
      },
    },
    walls: [],
    lights: [],
    notes: [],
    sounds: [],
    regions: [],
    drawings: [],
    tokens: session.tokens.map((token) =>
      tokenToFoundryExport(token, session.grid.feetPerCell, gridSize),
    ),
  };

  const importNotes = [
    "D&D Easy → Foundry Scene Import",
    "",
    "1. Copy the scene JSON into Foundry: Scenes → Import Data.",
    mapImageFilename
      ? `2. Place the companion map image at Data/worlds/<your-world>/maps/${mapImageFilename}`
      : "2. No map image was attached — set a background manually in Scene Configuration.",
    "3. Activate the scene, then run the DMMS macro pack to link tokens to imported actors.",
    "",
    `Grid: ${cols}×${rows} squares at ${session.grid.feetPerCell} ft (${gridSize}px cells).`,
  ].join("\n");

  return {
    meta: {
      source: "ddeasy",
      version: 1,
      exportedAt,
      platform: "foundry",
      system: "dnd5e",
    },
    data: scene,
    mapImageFilename,
    importNotes,
  };
}
