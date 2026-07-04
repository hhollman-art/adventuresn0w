export type TokenKind = "pc" | "ally" | "monster" | "object";

export type TabletopToken = {
  id: string;
  label: string;
  color: string;
  kind: TokenKind;
  /** Top-left position in grid cells (fractional when snap is off). */
  x: number;
  y: number;
  /** D&D size category: 1 Medium, 2 Large, 3 Huge, 4 Gargantuan (space in feet, scaled by grid). */
  size: number;
  hp: { current: number; max: number } | null;
  /** Hidden tokens are invisible on the player view. */
  hidden: boolean;
  /** Optional artwork drawn inside the token circle instead of initials. */
  imageDataUrl: string | null;
};

export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

/** Numeric modifiers an item applies to the character (can be negative). */
export type ItemBonuses = {
  ac: number;
  maxHp: number;
  speed: number;
  initiative: number;
  passivePerception: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

/** Gear, magic items, conditions, or other effects with stat modifiers. */
export type CharacterItem = {
  id: string;
  name: string;
  notes: string;
  bonuses: ItemBonuses;
};

/** A party member, entered from their D&D 5.2-style character sheet. */
export type PlayerCharacter = {
  id: string;
  /** Character name (required). */
  name: string;
  /** The person playing them. */
  playerName: string;
  species: string;
  className: string;
  subclass: string;
  background: string;
  alignment: string;
  level: number;
  abilities: AbilityScores;
  ac: number;
  maxHp: number;
  /** Walking speed in feet. */
  speed: number;
  /** Freeform: features, languages, proficiencies. */
  notes: string;
  /** Equipment and other modifiers (armor, magic items, etc.). */
  items: CharacterItem[];
  /** Bundled SRD spell catalogue ids (user-owned custom spells stay in notes). */
  knownSpellIds: string[];
  /** Last recorded current HP when the party was saved (campaign carry-over). */
  currentHp: number | null;
  /** The token representing this character on the battle map, if placed. */
  tokenId: string | null;
};

export type InitiativeEntry = {
  id: string;
  name: string;
  roll: number;
  tokenId: string | null;
};

export type DiceLogEntry = {
  id: string;
  at: string;
  expression: string;
  detail: string;
  total: number;
  /** Secret rolls never appear on the player view. */
  secret: boolean;
};

export type TabletopGrid = {
  cols: number;
  rows: number;
  /** Side length of each grid square in feet (default 5 ft). */
  feetPerCell: number;
  visible: boolean;
  snap: boolean;
};

export type TabletopFog = {
  enabled: boolean;
  /** Cell keys ("x,y") the players can see. Everything else is fogged. */
  revealed: string[];
};

export type TabletopSession = {
  version: 1;
  updatedAt: string;
  /** Saved party library id when this table is linked to a campaign roster. */
  activePartyId: string | null;
  mapName: string;
  /** Aligned display image (one pixel per CELL_PX per grid square). */
  mapImageDataUrl: string | null;
  /** Original upload for re-aligning without re-uploading. */
  mapSourceDataUrl: string | null;
  /** Grid squares represented by the map image (must match overlay for alignment). */
  mapGridCols: number;
  mapGridRows: number;
  grid: TabletopGrid;
  fog: TabletopFog;
  tokens: TabletopToken[];
  players: PlayerCharacter[];
  initiative: {
    entries: InitiativeEntry[];
    activeIndex: number;
    round: number;
  };
  log: DiceLogEntry[];
};

export const TOKEN_KIND_LABEL: Record<TokenKind, string> = {
  pc: "Player",
  ally: "Ally",
  monster: "Monster",
  object: "Object",
};

export const TOKEN_KIND_DEFAULT_COLOR: Record<TokenKind, string> = {
  pc: "#2563eb",
  ally: "#0d9488",
  monster: "#b91c1c",
  object: "#6b7280",
};

/** Swatches offered in the token color picker. */
export const TOKEN_COLOR_PALETTE = [
  "#2563eb", // blue
  "#0d9488", // teal
  "#16a34a", // green
  "#ca8a04", // gold
  "#ea580c", // orange
  "#b91c1c", // red
  "#9333ea", // purple
  "#db2777", // pink
  "#6b7280", // gray
  "#1f2937", // near-black
] as const;
