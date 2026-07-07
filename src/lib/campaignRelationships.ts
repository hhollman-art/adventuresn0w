/**
 * Persisted campaign relationship graphs (Tier 2 edges).
 * Tier 1 membership stays on SavedCampaign — never replaced.
 */

import type {
  CampaignRelationshipGraph,
  CfRelationshipEdge,
  CfRelationshipVerb,
  CfEndpoint,
  ValidateEdgeResult,
} from "@/lib/ciRelationshipGraph";
import type { CiClass } from "@/lib/ciRegistry";
import type { SrdEntityId } from "@/lib/srd/types";
import { validateCfRelationshipEdge } from "@/lib/ciRelationshipGraph";

const IDB_NAME = "ddeasy-campaign-relationships-v1";
const IDB_STORE = "kv";
const IDB_KEY = "graphs";
const LOCAL_STORAGE_KEY = "ddeasy-campaign-relationships-v1";

export const CAMPAIGN_RELATIONSHIPS_CHANGED_EVENT = "ddeasy-campaign-relationships-changed";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function emptyGraph(campaignId: string): CampaignRelationshipGraph {
  const now = new Date().toISOString();
  return { campaignId, version: 1, updatedAt: now, edges: [] };
}

export function fixCampaignRelationshipGraph(value: unknown): CampaignRelationshipGraph | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.campaignId !== "string" || !o.campaignId) return null;
  const edgesRaw = Array.isArray(o.edges) ? o.edges : [];
  const edges: CfRelationshipEdge[] = [];
  for (const row of edgesRaw) {
    const fixed = fixRelationshipEdge(row);
    if (fixed) edges.push(fixed);
  }
  const updatedAt =
    typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString();
  return {
    campaignId: o.campaignId,
    version: typeof o.version === "number" ? o.version : 1,
    updatedAt,
    edges,
  };
}

function fixRelationshipEdge(value: unknown): CfRelationshipEdge | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.rel !== "string" ||
    typeof o.createdAt !== "string" ||
    !o.from ||
    !o.to
  ) {
    return null;
  }
  const from = fixEndpoint(o.from);
  const to = fixEndpoint(o.to);
  if (!from || !to) return null;
  const edge: CfRelationshipEdge = {
    id: o.id,
    rel: o.rel as CfRelationshipVerb,
    from,
    to,
    createdAt: o.createdAt,
  };
  if (typeof o.label === "string") edge.label = o.label;
  if (o.source === "user" || o.source === "auto" || o.source === "import") {
    edge.source = o.source;
  }
  if (typeof o.bidirectional === "boolean") edge.bidirectional = o.bidirectional;
  const validation = validateCfRelationshipEdge(edge);
  if (!validation.ok) return null;
  return edge;
}

function fixEndpoint(value: unknown): CfEndpoint | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (o.kind === "srd" && typeof o.entityId === "string") {
    return {
      kind: "srd",
      entityId: o.entityId as SrdEntityId,
      ...(typeof o.name === "string" ? { name: o.name } : {}),
    };
  }
  if (o.kind === "cf" && typeof o.ciClass === "string" && typeof o.id === "string") {
    return { kind: "cf", ciClass: o.ciClass as CiClass, id: o.id };
  }
  return null;
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAMPAIGN_RELATIONSHIPS_CHANGED_EVENT));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
    });
  }
  return dbPromise;
}

async function idbGetAll(): Promise<CampaignRelationshipGraph[] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => {
      const v = req.result;
      if (v === undefined) resolve(undefined);
      else if (Array.isArray(v)) {
        resolve(
          v
            .map((row) => fixCampaignRelationshipGraph(row))
            .filter((g): g is CampaignRelationshipGraph => g !== null),
        );
      } else resolve(undefined);
    };
  });
}

async function idbSetAll(graphs: CampaignRelationshipGraph[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(graphs, IDB_KEY);
  });
}

function loadFromLocalStorage(): CampaignRelationshipGraph[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => fixCampaignRelationshipGraph(row))
      .filter((g): g is CampaignRelationshipGraph => g !== null);
  } catch {
    return [];
  }
}

async function loadAllInternal(): Promise<CampaignRelationshipGraph[]> {
  if (typeof window === "undefined") return [];
  try {
    let graphs = await idbGetAll();
    if (graphs === undefined || graphs.length === 0) {
      const mirror = loadFromLocalStorage();
      if (mirror.length > 0) {
        graphs = mirror;
        try {
          await idbSetAll(graphs);
        } catch {
          /* keep mirror */
        }
      } else {
        graphs = [];
      }
    }
    return graphs;
  } catch {
    return loadFromLocalStorage();
  }
}

async function persistAll(graphs: CampaignRelationshipGraph[]): Promise<void> {
  let lastError: unknown = null;
  try {
    await idbSetAll(graphs);
  } catch (err) {
    lastError = err;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(graphs));
    notifyChanged();
    if (!lastError) return;
  } catch (err) {
    lastError = err;
  }
  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error("Could not save relationship graphs");
  }
}

let writeMutex = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeMutex.then(fn, fn);
  writeMutex = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function loadCampaignRelationshipGraphs(): Promise<CampaignRelationshipGraph[]> {
  return loadAllInternal();
}

export async function getCampaignRelationshipGraph(
  campaignId: string,
): Promise<CampaignRelationshipGraph> {
  const all = await loadAllInternal();
  return all.find((g) => g.campaignId === campaignId) ?? emptyGraph(campaignId);
}

export async function saveCampaignRelationshipGraph(
  graph: CampaignRelationshipGraph,
): Promise<CampaignRelationshipGraph[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const nextGraph: CampaignRelationshipGraph = {
      ...graph,
      updatedAt: now,
      edges: graph.edges.filter((e) => validateCfRelationshipEdge(e).ok),
    };
    const all = await loadAllInternal();
    const rest = all.filter((g) => g.campaignId !== graph.campaignId);
    const merged = [...rest, nextGraph];
    await persistAll(merged);
    return merged;
  });
}

async function writeGraph(graph: CampaignRelationshipGraph): Promise<CampaignRelationshipGraph> {
  const now = new Date().toISOString();
  const nextGraph: CampaignRelationshipGraph = {
    ...graph,
    updatedAt: now,
    edges: graph.edges.filter((e) => validateCfRelationshipEdge(e).ok),
  };
  const all = await loadAllInternal();
  const rest = all.filter((g) => g.campaignId !== graph.campaignId);
  await persistAll([...rest, nextGraph]);
  return nextGraph;
}

export type AddRelationshipEdgeInput = {
  rel: CfRelationshipVerb;
  from: CfEndpoint;
  to: CfEndpoint;
  label?: string;
};

export async function addCampaignRelationshipEdge(
  campaignId: string,
  input: AddRelationshipEdgeInput,
): Promise<{ graph: CampaignRelationshipGraph; error?: string }> {
  if (typeof window === "undefined") {
    return { graph: emptyGraph(campaignId) };
  }
  return withWriteLock(async () => {
    const edge: CfRelationshipEdge = {
      id: newId(),
      rel: input.rel,
      from: input.from,
      to: input.to,
      label: input.label,
      createdAt: new Date().toISOString(),
      source: "user",
    };
    const validation = validateCfRelationshipEdge(edge);
    if (!validation.ok) {
      const current = await loadAllInternal();
      const existing = current.find((g) => g.campaignId === campaignId) ?? emptyGraph(campaignId);
      return { graph: existing, error: validation.reason };
    }
    const all = await loadAllInternal();
    const current = all.find((g) => g.campaignId === campaignId) ?? emptyGraph(campaignId);
    const graph = await writeGraph({ ...current, edges: [...current.edges, edge] });
    return { graph };
  });
}

export async function removeCampaignRelationshipEdge(
  campaignId: string,
  edgeId: string,
): Promise<CampaignRelationshipGraph> {
  if (typeof window === "undefined") return emptyGraph(campaignId);
  return withWriteLock(async () => {
    const all = await loadAllInternal();
    const current = all.find((g) => g.campaignId === campaignId) ?? emptyGraph(campaignId);
    return writeGraph({
      ...current,
      edges: current.edges.filter((e) => e.id !== edgeId),
    });
  });
}

export async function deleteCampaignRelationshipGraph(campaignId: string): Promise<void> {
  if (typeof window === "undefined") return;
  await withWriteLock(async () => {
    const all = await loadAllInternal();
    await persistAll(all.filter((g) => g.campaignId !== campaignId));
  });
}

export async function importCampaignRelationshipGraphs(
  rows: unknown[],
): Promise<{ added: number; graphs: CampaignRelationshipGraph[] }> {
  if (typeof window === "undefined") return { added: 0, graphs: [] };
  return withWriteLock(async () => {
    const existing = await loadAllInternal();
    const byCampaign = new Map(existing.map((g) => [g.campaignId, g]));
    let added = 0;
    for (const row of rows) {
      const graph = fixCampaignRelationshipGraph(row);
      if (!graph) continue;
      if (byCampaign.has(graph.campaignId)) continue;
      byCampaign.set(graph.campaignId, graph);
      added += 1;
    }
    const merged = [...byCampaign.values()];
    await persistAll(merged);
    return { added, graphs: merged };
  });
}

export function onCampaignRelationshipsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(CAMPAIGN_RELATIONSHIPS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CAMPAIGN_RELATIONSHIPS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function validateRelationshipEdge(edge: CfRelationshipEdge): ValidateEdgeResult {
  return validateCfRelationshipEdge(edge);
}
