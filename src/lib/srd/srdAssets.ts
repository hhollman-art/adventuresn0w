/**
 * SRD Assets — on-demand loader for the bundled rules reference tables.
 *
 * An **Asset** (see GLOSSARY.md) is static reference data that ships with the
 * App. These tables used to be compiled into the JavaScript bundle as
 * ~3.5 MB of literals (`srdEntities.data.ts`, `srdDocumentIndex.data.ts`,
 * `spellIndex.data.ts`, `srdDocument.data.ts`). They now live as raw JSON
 * under `public/srd/` and are fetched once per page load, then served from
 * the in-memory cache below.
 *
 * Design:
 *  - `ensureSrdAssets()` loads every table (idempotent, shares one in-flight
 *    promise, resets on failure so a retry is possible).
 *  - The sync accessors (`srdEntities()`, `srdSpellIndex()`,
 *    `srdDocumentIndex()`, …) read the cache. Callers must be behind
 *    `ensureSrdAssets()` — in the browser the root `SrdAssetGate` guarantees
 *    this; on the server and in tests use `srdAssets.node.ts`.
 *  - Reading is pluggable (`setSrdAssetReader`) so the same module works with
 *    `fetch()` in the browser and `fs` in Node without bundling `node:fs`.
 *
 * This module has no React or Node imports and is safe to import anywhere.
 */
import type {
  SrdDocumentAsset,
  SrdDocumentIndexEntry,
  SrdEntitiesAsset,
  SrdEntitySummary,
  SrdSpellIndexEntry,
} from "./types";

/** Public URL prefix where the JSON assets are served from. */
export const SRD_ASSET_BASE_PATH = "/srd";

export type SrdAssetName = "entities" | "document-index" | "spell-index" | "document";

export const SRD_ASSET_FILES: Record<SrdAssetName, string> = {
  entities: `${SRD_ASSET_BASE_PATH}/entities.json`,
  "document-index": `${SRD_ASSET_BASE_PATH}/document-index.json`,
  "spell-index": `${SRD_ASSET_BASE_PATH}/spell-index.json`,
  document: `${SRD_ASSET_BASE_PATH}/document.json`,
};

export const SRD_ASSET_NAMES: readonly SrdAssetName[] = [
  "entities",
  "document-index",
  "spell-index",
  "document",
];

/**
 * Content hash of the asset files, computed in `next.config.ts`. Only URLs
 * carrying the current `?v=` get the year-long immutable cache header.
 */
export const SRD_ASSET_VERSION: string = process.env.NEXT_PUBLIC_SRD_ASSET_VERSION ?? "";

/** URL the browser fetches for one asset (versioned when a build hash exists). */
export function srdAssetUrl(name: SrdAssetName): string {
  const file = SRD_ASSET_FILES[name];
  return SRD_ASSET_VERSION ? `${file}?v=${SRD_ASSET_VERSION}` : file;
}

/* ------------------------------------------------------------------ */
/* Cold-start preload hints                                            */
/* ------------------------------------------------------------------ */

/** Set after a successful load; absent or stale means this version is not in the HTTP cache yet. */
const WARM_MARKER_KEY = "ddeasy-srd-asset-warm";

/** A fetch slower than this on a non-cached response counts as a cold start. */
export const SRD_COLD_LOAD_THRESHOLD_MS = 100;

/** True when this browser has not loaded the current asset version yet. */
export function isSrdColdStart(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WARM_MARKER_KEY) !== (SRD_ASSET_VERSION || "unversioned");
  } catch {
    return true;
  }
}

/**
 * Add `<link rel="preload" as="fetch">` for every asset so downloads start
 * before React mounts `SrdAssetGate`. `crossorigin="anonymous"` matches the
 * credentials mode of a same-origin `fetch()`, so the preload is reused.
 */
export function injectSrdPreloadHints(): void {
  if (typeof document === "undefined") return;
  for (const name of SRD_ASSET_NAMES) {
    const href = srdAssetUrl(name);
    if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.crossOrigin = "anonymous";
    link.href = href;
    document.head.appendChild(link);
  }
}

/**
 * Inline `<head>` script — runs before any bundle loads, and injects the
 * preload hints only on a cold start (same rule as `isSrdColdStart`).
 */
export function srdPreloadBootScript(): string {
  const hrefs = JSON.stringify(SRD_ASSET_NAMES.map((name) => srdAssetUrl(name)));
  const warm = JSON.stringify(SRD_ASSET_VERSION || "unversioned");
  return `(function(){try{if(localStorage.getItem(${JSON.stringify(WARM_MARKER_KEY)})===${warm})return;}catch(e){}${hrefs}.forEach(function(h){var l=document.createElement("link");l.rel="preload";l.as="fetch";l.crossOrigin="anonymous";l.href=h;document.head.appendChild(l);});})();`;
}

export type SrdAssetLoadTiming = {
  url: string;
  durationMs: number;
  /** 0 when served from the HTTP cache. */
  transferSize: number;
  cold: boolean;
};

/** Resource Timing for the current asset URLs (browser only; empty elsewhere). */
export function srdAssetLoadTimings(): SrdAssetLoadTiming[] {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return [];
  }
  const urls = new Set(SRD_ASSET_NAMES.map((name) => srdAssetUrl(name)));
  return (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
    .filter((entry) => urls.has(new URL(entry.name).pathname + new URL(entry.name).search))
    .map((entry) => ({
      url: entry.name,
      durationMs: Math.round(entry.duration),
      transferSize: entry.transferSize,
      cold: entry.transferSize > 0 && entry.duration > SRD_COLD_LOAD_THRESHOLD_MS,
    }));
}

function markSrdAssetsWarm(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WARM_MARKER_KEY, SRD_ASSET_VERSION || "unversioned");
  } catch {
    /* hint only — next load preloads again */
  }
}

type SrdAssetTable = {
  entities: SrdEntitiesAsset;
  "document-index": readonly SrdDocumentIndexEntry[];
  "spell-index": readonly SrdSpellIndexEntry[];
  document: SrdDocumentAsset;
};

/** Reads one asset file's raw text given its public URL path (e.g. `/srd/entities.json`). */
export type SrdAssetReader = (url: string) => Promise<string>;

const EMPTY_ENTITIES: SrdEntitiesAsset = Object.freeze({
  entityCounts: {},
  taxonomyCounts: {},
  entities: Object.freeze([]) as readonly SrdEntitySummary[],
});
const EMPTY_INDEX: readonly SrdDocumentIndexEntry[] = Object.freeze([]);
const EMPTY_SPELLS: readonly SrdSpellIndexEntry[] = Object.freeze([]);
const EMPTY_DOCUMENT: SrdDocumentAsset = Object.freeze({
  pdfId: "",
  chapters: Object.freeze([]) as readonly SrdDocumentAsset["chapters"][number][],
  body: "",
});

/* ------------------------------------------------------------------ */
/* Reader                                                              */
/* ------------------------------------------------------------------ */

async function fetchReader(url: string): Promise<string> {
  if (typeof fetch !== "function") {
    throw new Error("fetch() is unavailable — register a reader with setSrdAssetReader().");
  }
  if (typeof window === "undefined" && !/^https?:\/\//.test(url)) {
    throw new Error(
      `SRD assets cannot be fetched by relative URL outside the browser (${url}). ` +
        "Import `@/lib/srd/srdAssets.node` on the server / in tests.",
    );
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SRD asset request failed (${res.status}) for ${url}`);
  return res.text();
}

let reader: SrdAssetReader = fetchReader;

/** Swap the transport (browser `fetch` by default; `fs` on the server / in tests). */
export function setSrdAssetReader(next: SrdAssetReader | null): void {
  reader = next ?? fetchReader;
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

// Internal storage is untyped; every public accessor narrows at its boundary.
const cache = new Map<SrdAssetName, unknown>();
const inflight = new Map<SrdAssetName, Promise<unknown>>();
const listeners = new Set<() => void>();
let warnedUnready = false;

function notify(): void {
  for (const listener of listeners) listener();
}

/** Validate the JSON envelope for one asset (row-level shape is trusted from the build). */
function parseAsset(name: SrdAssetName, text: string): unknown {
  const raw = JSON.parse(text) as unknown;
  if (name === "entities") {
    if (
      typeof raw !== "object" ||
      raw === null ||
      !Array.isArray((raw as SrdEntitiesAsset).entities)
    ) {
      throw new Error("entities.json is malformed — expected { entityCounts, taxonomyCounts, entities[] }.");
    }
    const o = raw as SrdEntitiesAsset;
    const table: SrdEntitiesAsset = {
      entityCounts: o.entityCounts ?? {},
      taxonomyCounts: o.taxonomyCounts ?? {},
      entities: o.entities,
    };
    return table;
  }
  if (name === "document") {
    const o = raw as Partial<SrdDocumentAsset> | null;
    if (
      typeof o !== "object" ||
      o === null ||
      typeof o.body !== "string" ||
      typeof o.pdfId !== "string" ||
      !Array.isArray(o.chapters)
    ) {
      throw new Error("document.json is malformed — expected { pdfId, chapters[], body }.");
    }
    const table: SrdDocumentAsset = { pdfId: o.pdfId, chapters: o.chapters, body: o.body };
    return table;
  }
  if (!Array.isArray(raw)) {
    throw new Error(`${SRD_ASSET_FILES[name]} is malformed — expected a JSON array.`);
  }
  return raw;
}

/** Load one asset (cached; shares an in-flight request). */
export function loadSrdAsset<K extends SrdAssetName>(name: K): Promise<SrdAssetTable[K]> {
  if (cache.has(name)) return Promise.resolve(cache.get(name) as SrdAssetTable[K]);
  const pending = inflight.get(name);
  if (pending) return pending as Promise<SrdAssetTable[K]>;

  const promise = reader(srdAssetUrl(name))
    .then((text) => {
      const parsed = parseAsset(name, text);
      cache.set(name, parsed);
      inflight.delete(name);
      notify();
      return parsed;
    })
    .catch((err: unknown) => {
      inflight.delete(name);
      throw err;
    });
  inflight.set(name, promise);
  return promise as Promise<SrdAssetTable[K]>;
}

/** Load every SRD asset. Idempotent; safe to call from many places at once. */
export async function ensureSrdAssets(): Promise<void> {
  await Promise.all(SRD_ASSET_NAMES.map((name) => loadSrdAsset(name)));
  markSrdAssetsWarm();
}

/** True once every asset is in the cache. */
export function isSrdAssetsReady(): boolean {
  return SRD_ASSET_NAMES.every((name) => cache.has(name));
}

function cached<K extends SrdAssetName>(name: K): SrdAssetTable[K] | undefined {
  return cache.get(name) as SrdAssetTable[K] | undefined;
}

/** Subscribe to cache changes (for `useSyncExternalStore`). Returns an unsubscribe. */
export function subscribeSrdAssets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function warnUnready(name: SrdAssetName): void {
  if (warnedUnready || process.env.NODE_ENV === "production") return;
  warnedUnready = true;
  console.warn(
    `[srd] ${name} was read before ensureSrdAssets() resolved — returning empty data. ` +
      "Render SRD consumers behind SrdAssetGate, or await ensureSrdAssets() first.",
  );
}

/* ------------------------------------------------------------------ */
/* Sync accessors (cache reads)                                        */
/* ------------------------------------------------------------------ */

/** All bundled SRD entity summaries (empty until loaded). */
export function srdEntities(): readonly SrdEntitySummary[] {
  const table = cached("entities");
  if (!table) {
    warnUnready("entities");
    return EMPTY_ENTITIES.entities;
  }
  return table.entities;
}

/** Entity counts by `SrdEntityKind` (mirrors `SRD_ENTITY_COUNTS`). */
export function srdEntityCounts(): Record<string, number> {
  const table = cached("entities");
  if (!table) {
    warnUnready("entities");
    return EMPTY_ENTITIES.entityCounts;
  }
  return table.entityCounts;
}

/** Entity counts by taxonomy category (mirrors `SRD_TAXONOMY_COUNTS`). */
export function srdTaxonomyCounts(): Record<string, number> {
  const table = cached("entities");
  if (!table) {
    warnUnready("entities");
    return EMPTY_ENTITIES.taxonomyCounts;
  }
  return table.taxonomyCounts;
}

/** Heading index into the bundled SRD document (mirrors `SRD_DOCUMENT_INDEX`). */
export function srdDocumentIndex(): readonly SrdDocumentIndexEntry[] {
  const table = cached("document-index");
  if (!table) {
    warnUnready("document-index");
    return EMPTY_INDEX;
  }
  return table;
}

/** Flat searchable spell index (mirrors `SRD_SPELL_INDEX`). */
export function srdSpellIndex(): readonly SrdSpellIndexEntry[] {
  const table = cached("spell-index");
  if (!table) {
    warnUnready("spell-index");
    return EMPTY_SPELLS;
  }
  return table;
}

/**
 * The full bundled SRD document — `pdfId`, `chapters`, and the markdown `body`
 * that entity / index byte ranges slice into (mirrors `SRD_DOCUMENT_PDF_ID`,
 * `SRD_DOCUMENT_CHAPTERS`, `SRD_DOCUMENT_BODY`).
 */
export function srdDocument(): SrdDocumentAsset {
  const table = cached("document");
  if (!table) {
    warnUnready("document");
    return EMPTY_DOCUMENT;
  }
  return table;
}

/**
 * Memoize a derived structure (lookup map, sorted copy) against the identity
 * of the source table, so it is rebuilt exactly once per load and never while
 * the table is unchanged.
 */
export function memoBySrdTable<T extends object, R>(
  getTable: () => T,
  build: (table: T) => R,
): () => R {
  let from: T | null = null;
  let value: R | undefined;
  return () => {
    const table = getTable();
    if (table !== from || value === undefined) {
      from = table;
      value = build(table);
    }
    return value;
  };
}

/** Test-only: drop the cache so a test can exercise loading behaviour. */
export function __resetSrdAssetsForTests(): void {
  cache.clear();
  inflight.clear();
  warnedUnready = false;
  notify();
}
