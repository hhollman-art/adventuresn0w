/**
 * Export the bundled SRD Asset tables from their TypeScript data modules into
 * raw JSON under `public/srd/`, so the App fetches them on demand instead of
 * compiling ~1.6 MB of literals into the JavaScript bundle.
 *
 *   npm run build:srd-assets           — write public/srd/*.json
 *   npm run verify:srd-assets          — re-read the JSON and deep-compare it
 *                                        against the TypeScript source modules
 *
 * Run `build:srd-assets` after any of the upstream `build:srd-*` scripts that
 * regenerate the `*.data.ts` modules. The JSON files are the runtime source of
 * truth for `src/lib/srd/srdAssets.ts`; the `.data.ts` modules remain as the
 * build-pipeline intermediate until every script writes JSON directly.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "srd");

type AssetSpec = {
  file: string;
  /** Load the TypeScript source and shape it exactly as the JSON mirrors it. */
  load: () => Promise<unknown>;
};

const ASSETS: Record<string, AssetSpec> = {
  entities: {
    file: "entities.json",
    load: async () => {
      const mod = await import("../src/lib/srd/srdEntities.data.ts");
      return {
        entityCounts: mod.SRD_ENTITY_COUNTS,
        taxonomyCounts: mod.SRD_TAXONOMY_COUNTS,
        entities: mod.SRD_ENTITIES,
      };
    },
  },
  "document-index": {
    file: "document-index.json",
    load: async () => {
      const mod = await import("../src/lib/srd/srdDocumentIndex.data.ts");
      return mod.SRD_DOCUMENT_INDEX;
    },
  },
  "spell-index": {
    file: "spell-index.json",
    load: async () => {
      const mod = await import("../src/lib/srd/spellIndex.data.ts");
      return mod.SRD_SPELL_INDEX;
    },
  },
  document: {
    file: "document.json",
    load: async () => {
      const mod = await import("../src/lib/srd/srdDocument.data.ts");
      return {
        pdfId: mod.SRD_DOCUMENT_PDF_ID,
        chapters: mod.SRD_DOCUMENT_CHAPTERS,
        body: mod.SRD_DOCUMENT_BODY,
      };
    },
  },
};

/** Count `undefined` leaves — JSON cannot carry them, so they must be zero. */
function countUndefined(value: unknown): number {
  if (value === undefined) return 1;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countUndefined(v), 0);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).reduce<number>((n, v) => n + countUndefined(v), 0);
  }
  return 0;
}

function describe(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} rows`;
  if (typeof value === "string") return `${value.length.toLocaleString()} chars`;
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;
    return Object.entries(o)
      .map(([k, v]) => `${k}: ${Array.isArray(v) || typeof v === "string" ? describe(v) : typeof v}`)
      .join(", ");
  }
  return typeof value;
}

async function exportAssets(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  for (const [name, spec] of Object.entries(ASSETS)) {
    const data = await spec.load();
    const lost = countUndefined(data);
    if (lost > 0) {
      throw new Error(`${name}: ${lost} undefined value(s) would be lost in JSON — fix the source first.`);
    }
    const target = join(OUT_DIR, spec.file);
    await writeFile(target, JSON.stringify(data), "utf8");
    const bytes = (await readFile(target)).byteLength;
    console.log(`wrote public/srd/${spec.file} — ${describe(data)} — ${(bytes / 1024).toFixed(0)} KB`);
  }
}

async function verifyAssets(): Promise<void> {
  let failures = 0;
  for (const [name, spec] of Object.entries(ASSETS)) {
    const source = await spec.load();
    const target = join(OUT_DIR, spec.file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(target, "utf8"));
    } catch (err) {
      failures += 1;
      console.error(`✗ ${spec.file}: cannot read — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    // Strict comparison against the live TypeScript object: catches lost
    // undefined values, numeric drift, and key-order-insensitive differences.
    if (isDeepStrictEqual(source, parsed)) {
      console.log(`✓ ${spec.file} mirrors ${name} exactly (${describe(parsed)})`);
    } else {
      failures += 1;
      console.error(`✗ ${spec.file} differs from the TypeScript source for ${name}`);
    }
  }
  if (failures > 0) {
    console.error(`${failures} asset(s) out of sync — run \`npm run build:srd-assets\`.`);
    process.exit(1);
  }
}

const mode = process.argv.includes("--verify") ? "verify" : "export";
(mode === "verify" ? verifyAssets() : exportAssets()).catch((err) => {
  console.error(err);
  process.exit(1);
});
