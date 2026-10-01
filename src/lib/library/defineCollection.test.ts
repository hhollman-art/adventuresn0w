import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryDocumentBackend, type DocumentBackend } from "./documentBackend";
import { defineCollection } from "./defineCollection";

type Note = { id: string; title: string; updatedAt: string };

function fixNote(value: unknown): Note | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  return { id: o.id, title: o.title, updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "" };
}

const note = (id: string, updatedAt: string): Note => ({ id, title: `Note ${id}`, updatedAt });

function notes(overrides: Partial<Parameters<typeof defineCollection<Note>>[0]> = {}) {
  return defineCollection<Note>({
    name: "note",
    normalize: fixNote,
    max: 3,
    changedEvent: "test-notes-changed",
    compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    backend: createMemoryDocumentBackend(),
    ...overrides,
  });
}

function failingBackend(): DocumentBackend {
  const fail = () => Promise.reject(new Error("backend down"));
  return { readAll: fail, replaceAll: fail, readMeta: fail, writeMeta: fail };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("defineCollection", () => {
  it("persists sorted rows, caps to max, and returns what the mutation produced", async () => {
    const collection = notes();
    const returned = await collection.write(() => [
      note("a", "2026-01-01"),
      note("b", "2026-03-01"),
      note("c", "2026-02-01"),
      note("d", "2026-04-01"),
    ]);
    expect(returned.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect((await collection.load()).map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("does not persist when the mutation throws", async () => {
    const collection = notes();
    await collection.write(() => [note("a", "2026-01-01")]);
    await expect(
      collection.write(() => {
        throw new Error("An NPC needs at least a name.");
      }),
    ).rejects.toThrow("needs at least a name");
    expect((await collection.load()).map((n) => n.id)).toEqual(["a"]);
  });

  it("serializes concurrent writes so none are lost", async () => {
    const collection = notes({ max: 50 });
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        collection.write((current) => [note(`n${i}`, `2026-01-${String(i + 10)}`), ...current]),
      ),
    );
    expect(await collection.load()).toHaveLength(10);
  });

  it("imports non-destructively: new ids added, existing and invalid rows skipped", async () => {
    const collection = notes({ max: 10 });
    await collection.write(() => [{ id: "a", title: "Mine", updatedAt: "2026-01-01" }]);
    const result = await collection.importRows([
      { id: "a", title: "Theirs", updatedAt: "2026-05-01" },
      note("b", "2026-02-01"),
      note("b", "2026-02-02"),
      { id: 7 },
    ]);
    expect(result.added).toBe(1);
    const stored = await collection.load();
    expect(stored.map((n) => n.id)).toEqual(["b", "a"]);
    expect(stored.find((n) => n.id === "a")?.title).toBe("Mine");
  });

  it("isolates collections sharing one backend", async () => {
    const backend = createMemoryDocumentBackend();
    const first = notes({ backend, name: "first" });
    const second = notes({ backend, name: "second" });
    await first.write(() => [note("a", "2026-01-01")]);
    expect(await second.load()).toEqual([]);
  });

  it("migrates legacy rows once and never resurrects them after deletion", async () => {
    const legacy = vi.fn(async () => [note("old", "2026-01-01"), { broken: true }]);
    const backend = createMemoryDocumentBackend();
    const collection = notes({ backend, legacySources: [legacy] });

    expect((await collection.load()).map((n) => n.id)).toEqual(["old"]);
    await collection.write(() => []);

    const reloaded = notes({ backend, legacySources: [legacy] });
    expect(await reloaded.load()).toEqual([]);
    expect(legacy).toHaveBeenCalledTimes(1);
  });

  it("keeps existing rows over legacy rows with the same id", async () => {
    const backend = createMemoryDocumentBackend();
    await backend.replaceAll("note", [{ id: "a", title: "Current", updatedAt: "2026-02-01" } as Note]);
    const collection = notes({
      backend,
      legacySources: [async () => [{ id: "a", title: "Legacy", updatedAt: "2026-09-01" }]],
    });
    expect((await collection.load())[0]?.title).toBe("Current");
  });

  it("falls back to the localStorage mirror when the backend is unavailable", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    const collection = notes({ backend: failingBackend(), mirrorKey: "test-mirror" });

    await expect(collection.write(() => [note("a", "2026-01-01")])).rejects.toThrow("backend down");
    expect(JSON.parse(store.get("test-mirror") ?? "[]")).toHaveLength(1);
    expect((await collection.load()).map((n) => n.id)).toEqual(["a"]);
  });

  it("restores an emptied backend from the mirror", async () => {
    const store = new Map<string, string>([["test-mirror", JSON.stringify([note("m", "2026-01-01")])]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    const backend = createMemoryDocumentBackend();
    const collection = notes({ backend, mirrorKey: "test-mirror" });
    expect((await collection.load()).map((n) => n.id)).toEqual(["m"]);
    expect(await backend.readAll("note")).toHaveLength(1);
  });
});
