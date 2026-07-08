#!/usr/bin/env node
/**
 * Consolidate hyper-segmented SRD rule fragments into unified bundle JSON files.
 *
 * Two input modes:
 *   1. --from-bundled (default) — read existing srdDocumentIndex + srdEntities + body
 *   2. --input-dir <path>       — scan loose .json / .md micro-files and merge by taxonomy
 *
 * Output: data/srd/bundles/{create_a_character,combat_rules,adventuring_rules}.json
 *
 * Data contract (every section record retains):
 *   - key, title, header, markdown
 *   - _category  (from taxonomyCategory)
 *   - _source_file (from sourceFile or derived path)
 *   - chapter, order, start, end (when available from bundled index)
 *
 * Usage:
 *   node scripts/consolidate-srd-rules.mjs
 *   node scripts/consolidate-srd-rules.mjs --input-dir data/srd/fragments
 *   node scripts/consolidate-srd-rules.mjs --dry-run
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SRD_RULE_BUNDLE_META,
  META_SECTION_KEYS,
  resolveBundleForFragment,
  resolveBundleForIndexRow,
} from "./srd-rule-bundle-taxonomy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "srd", "bundles");
const OUT_TS = join(ROOT, "src", "lib", "srd", "srdRuleBundles.data.ts");
const DOC_PATH = join(ROOT, "src", "lib", "srd", "srdDocument.data.ts");
const INDEX_PATH = join(ROOT, "src", "lib", "srd", "srdDocumentIndex.data.ts");
const ENTITIES_PATH = join(ROOT, "src", "lib", "srd", "srdEntities.data.ts");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fromBundled = !args.includes("--input-dir");
const inputDirArg = args.find((a, i) => args[i - 1] === "--input-dir");

function parseTsExportArray(filePath, exportName) {
  const src = readFileSync(filePath, "utf8");
  const marker = `export const ${exportName}`;
  const startIdx = src.indexOf(marker);
  if (startIdx === -1) {
    throw new Error(`Could not find export ${exportName} in ${filePath}`);
  }
  const eqIdx = src.indexOf("=", startIdx);
  if (eqIdx === -1) {
    throw new Error(`Could not find assignment for ${exportName} in ${filePath}`);
  }
  const arrayStart = src.indexOf("[", eqIdx);
  if (arrayStart === -1) {
    throw new Error(`Could not find array for ${exportName} in ${filePath}`);
  }

  let depth = 0;
  for (let i = arrayStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(src.slice(arrayStart, i + 1));
      }
    }
  }
  throw new Error(`Unterminated array for ${exportName} in ${filePath}`);
}

function parseTsExportString(filePath, exportName) {
  const src = readFileSync(filePath, "utf8");
  const re = new RegExp(`export const ${exportName}: string = ([\\s\\S]+);\\s*$`);
  const match = src.match(re);
  if (!match) throw new Error(`Could not parse ${exportName} from ${filePath}`);
  return JSON.parse(match[1]);
}

/** @returns {import('./srd-rule-bundle-taxonomy.mjs').SrdRuleBundleId[]} */
function bundleOrder() {
  return ["create_a_character", "combat_rules", "adventuring_rules"];
}

function emptyBundles() {
  /** @type {Record<string, { bundleId: string; title: string; description: string; sections: object[] }>} */
  const out = {};
  for (const id of bundleOrder()) {
    out[id] = {
      bundleId: id,
      title: SRD_RULE_BUNDLE_META[id].title,
      description: SRD_RULE_BUNDLE_META[id].description,
      sections: [],
    };
  }
  out.unclassified = {
    bundleId: "unclassified",
    title: SRD_RULE_BUNDLE_META.unclassified.title,
    description: SRD_RULE_BUNDLE_META.unclassified.description,
    sections: [],
  };
  return out;
}

/**
 * Normalize a fragment or entity into the unified section contract.
 * @param {Record<string, unknown>} raw
 * @param {{ body?: string; order?: number }} ctx
 */
function toSectionRecord(raw, ctx = {}) {
  const key = String(raw.key ?? raw.slug ?? basename(String(raw._source_file ?? ""), extname(String(raw._source_file ?? ""))));
  const title = String(raw.title ?? raw.name ?? raw.header ?? key);
  const start = typeof raw.start === "number" ? raw.start : null;
  const end = typeof raw.end === "number" ? raw.end : null;
  let markdown = String(raw.markdown ?? raw.content ?? raw.body ?? "");

  if (!markdown && ctx.body && start != null && end != null) {
    markdown = ctx.body.slice(start, end).trim();
  }

  const sourceFile =
    String(raw._source_file ?? raw.sourceFile ?? "") ||
    (raw.chapter && key ? `srdDocumentIndex:${raw.chapter}/${key}` : `fragment:${key}`);

  return {
    key,
    title,
    header: String(raw.header ?? title),
    markdown,
    _category: String(raw._category ?? raw.taxonomyCategory ?? "rules"),
    _source_file: sourceFile,
    chapter: String(raw.chapter ?? ""),
    order: ctx.order ?? 0,
    ...(start != null ? { start } : {}),
    ...(end != null ? { end } : {}),
    ...(raw.id ? { entityId: raw.id } : {}),
    ...(raw.kind ? { kind: raw.kind } : {}),
  };
}

function loadFromBundledCorpus() {
  const body = parseTsExportString(DOC_PATH, "SRD_DOCUMENT_BODY");
  const index = parseTsExportArray(INDEX_PATH, "SRD_DOCUMENT_INDEX");
  const entities = parseTsExportArray(ENTITIES_PATH, "SRD_ENTITIES");

  const entityByKey = new Map(entities.map((e) => [e.key, e]));
  const bundles = emptyBundles();
  const seen = new Set();

  for (const row of index) {
    const bundleId = resolveBundleForIndexRow(row);
    if (!bundleId) continue;
    if (META_SECTION_KEYS.has(row.key)) continue;

    const entity = entityByKey.get(row.key);
    if (!entity && row.level <= 3) continue;

    const dedupeKey = `${bundleId}:${row.key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const section = toSectionRecord(
      {
        ...row,
        ...(entity ?? {}),
        _category: entity?.taxonomyCategory ?? "rules",
        _source_file: entity?.sourceFile ?? `srdDocumentIndex:${row.chapter}/${row.key}`,
      },
      { body, order: row.start },
    );

    bundles[bundleId].sections.push(section);
  }

  for (const id of bundleOrder()) {
    bundles[id].sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    bundles[id].sections.forEach((s, i) => {
      s.order = i;
    });
  }

  return bundles;
}

function walkDir(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, files);
    else if (/\.(json|md|markdown)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

function loadFragmentFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");

  if (ext === ".json") {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    if (Array.isArray(parsed)) {
      return parsed.map((row, i) => ({
        ...row,
        _source_file: row._source_file ?? row.sourceFile ?? `${rel}#${i}`,
      }));
    }
    if (parsed.sections && Array.isArray(parsed.sections)) {
      return parsed.sections.map((row, i) => ({
        ...row,
        _source_file: row._source_file ?? row.sourceFile ?? `${rel}#${i}`,
      }));
    }
    return [{ ...parsed, _source_file: parsed._source_file ?? parsed.sourceFile ?? rel }];
  }

  const markdown = readFileSync(filePath, "utf8");
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? basename(filePath, ext);
  const key = title
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return [
    {
      key,
      title,
      header: title,
      markdown,
      _source_file: rel,
      _category: "rules",
    },
  ];
}

function loadFromFragmentDirectory(dir) {
  if (!statSync(dir).isDirectory()) {
    throw new Error(`Input directory not found: ${dir}`);
  }

  const bundles = emptyBundles();
  const files = walkDir(dir);

  for (const filePath of files) {
    const fragments = loadFragmentFile(filePath);
    for (const raw of fragments) {
      const bundleId = resolveBundleForFragment(raw, relative(dir, filePath)) ?? "unclassified";
      const section = toSectionRecord(raw, { order: bundles[bundleId].sections.length });
      bundles[bundleId].sections.push(section);
    }
  }

  for (const id of [...bundleOrder(), "unclassified"]) {
    bundles[id].sections.sort((a, b) => {
      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      if (ao !== bo) return ao - bo;
      return String(a.title).localeCompare(String(b.title));
    });
    bundles[id].sections.forEach((s, i) => {
      s.order = i;
    });
  }

  return bundles;
}

function toSectionRef(section) {
  const ref = {
    key: section.key,
    title: section.title,
    header: section.header,
    _category: section._category,
    _source_file: section._source_file,
    chapter: section.chapter,
    order: section.order,
  };
  if (typeof section.start === "number") ref.start = section.start;
  if (typeof section.end === "number") ref.end = section.end;
  if (section.entityId) ref.entityId = section.entityId;
  if (section.kind) ref.kind = section.kind;
  return ref;
}

function writeTsBundleModule(bundles) {
  const bundleRecords = bundleOrder().map((id) => {
    const bundle = bundles[id];
    return {
      bundleId: id,
      title: bundle.title,
      description: bundle.description,
      sectionCount: bundle.sections.length,
      sections: bundle.sections.map(toSectionRef),
    };
  });

  const sectionKeys = bundleOrder().flatMap((id) =>
    bundles[id].sections.map((section) => section.key),
  );

  const ts = `/** Auto-generated by scripts/consolidate-srd-rules.mjs — do not edit by hand. */
import type { SrdRuleBundleId } from "./types";

export type SrdRuleBundleSectionRef = {
  key: string;
  title: string;
  header: string;
  _category: string;
  _source_file: string;
  chapter: string;
  order: number;
  start?: number;
  end?: number;
  entityId?: string;
  kind?: string;
};

export type SrdRuleBundleRecord = {
  bundleId: SrdRuleBundleId;
  title: string;
  description: string;
  sectionCount: number;
  sections: readonly SrdRuleBundleSectionRef[];
};

export const SRD_RULE_BUNDLES: readonly SrdRuleBundleRecord[] = ${JSON.stringify(bundleRecords, null, 2)} as const;

export const SRD_BUNDLED_SECTION_KEYS: ReadonlySet<string> = new Set(${JSON.stringify(sectionKeys, null, 2)});
`;

  if (dryRun) {
    console.log(`[dry-run] Would write ${relative(ROOT, OUT_TS)}`);
    return;
  }
  writeFileSync(OUT_TS, ts, "utf8");
  console.log(`Wrote ${relative(ROOT, OUT_TS)}`);
}

function writeBundles(bundles) {
  mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {
    consolidatedAt: new Date().toISOString(),
    edition: "5.2.1",
    inputMode: fromBundled ? "from-bundled" : "input-dir",
    bundles: [],
  };

  for (const id of [...bundleOrder(), "unclassified"]) {
    const bundle = bundles[id];
    if (id === "unclassified" && bundle.sections.length === 0) continue;

    const payload = {
      ...bundle,
      sectionCount: bundle.sections.length,
      consolidatedAt: manifest.consolidatedAt,
    };

    const outFile = join(OUT_DIR, SRD_RULE_BUNDLE_META[id].outputFile);
    manifest.bundles.push({
      bundleId: id,
      outputFile: SRD_RULE_BUNDLE_META[id].outputFile,
      sectionCount: bundle.sections.length,
    });

    if (dryRun) {
      console.log(`[dry-run] Would write ${outFile} (${bundle.sections.length} sections)`);
    } else {
      writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      console.log(`Wrote ${relative(ROOT, outFile)} (${bundle.sections.length} sections)`);
    }
  }

  const manifestPath = join(OUT_DIR, "manifest.json");
  if (dryRun) {
    console.log(`[dry-run] Would write ${manifestPath}`);
  } else {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Wrote ${relative(ROOT, manifestPath)}`);
  }

  writeTsBundleModule(bundles);
}

function printAuditSummary(bundles) {
  console.log("\n--- SRD Rule Bundle Audit ---\n");
  for (const id of bundleOrder()) {
    const b = bundles[id];
    console.log(`${b.title} (${id}): ${b.sections.length} sections`);
    const sample = b.sections.slice(0, 5).map((s) => s.title);
    if (sample.length) console.log(`  First: ${sample.join(" → ")}`);
  }
  const unclassified = bundles.unclassified?.sections.length ?? 0;
  if (unclassified) console.log(`\nUnclassified fragments: ${unclassified} (review _unclassified_fragments.json)`);
  console.log("");
}

function main() {
  console.log(`SRD rules consolidation (${fromBundled ? "from bundled corpus" : `input-dir: ${inputDirArg}`})`);

  const bundles = fromBundled ? loadFromBundledCorpus() : loadFromFragmentDirectory(inputDirArg);
  printAuditSummary(bundles);
  writeBundles(bundles);

  if (dryRun) console.log("Dry run complete — no files written.");
}

main();
