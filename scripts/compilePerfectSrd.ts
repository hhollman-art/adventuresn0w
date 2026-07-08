#!/usr/bin/env node
/**
 * Clean reset + perfect SRD macro compile.
 *
 * Step 1: Wipe data/srd/ (all legacy bundles, micro-files, srd_database.json)
 * Step 2: Stream PDF anchors + bundled corpus → exactly 3 unified macro-files
 *
 * Source PDF (untouched): data/srd-source/SRD_CC_v5.2.1.pdf
 * Output (fresh):         data/srd/macro/{create_a_character,gameplay_mechanics,fighter}.json
 *
 * Usage:
 *   npm run compile:perfect-srd
 *   npm run compile:perfect-srd -- --dry-run
 */

import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanPdfText, extractPdfPages, joinPages, type PdfEngine } from "./srd-pdf/extractPages.js";
import {
  detectAllAnchorBoundaries,
  logAnchorBoundaries,
  stripTableOfContents,
  type AnchorBoundary,
} from "./srd-macro/pdfAnchors.js";
import { loadSrdCorpus } from "./srd-macro/corpus.js";
import {
  buildCreateACharacterMacro,
  buildGameplayMechanicsMacro,
  buildPlayerClassMacro,
} from "./srd-macro/buildMacroBundles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SOURCE_PDF = join(ROOT, "data", "srd-source", "SRD_CC_v5.2.1.pdf");
const SRD_DATA_ROOT = join(ROOT, "data", "srd");
const OUTPUT_DIR = join(SRD_DATA_ROOT, "macro");

const UNIFIED_MACRO_FILES = [
  "create_a_character.json",
  "gameplay_mechanics.json",
  "fighter.json",
] as const;

type CliOptions = {
  pdfPath: string;
  outDir: string;
  engine: PdfEngine;
  dryRun: boolean;
  skipPurge: boolean;
  verbose: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    pdfPath: SOURCE_PDF,
    outDir: OUTPUT_DIR,
    engine: "pdfjs",
    dryRun: false,
    skipPurge: false,
    verbose: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--skip-purge") opts.skipPurge = true;
    else if (arg === "--quiet") opts.verbose = false;
    else if (arg === "--pdf") opts.pdfPath = resolve(argv[++i] ?? opts.pdfPath);
    else if (arg === "--out") opts.outDir = resolve(argv[++i] ?? opts.outDir);
    else if (arg === "--engine") {
      const engine = argv[++i] as PdfEngine;
      if (engine !== "pdfjs" && engine !== "pdf-parse") {
        throw new Error(`Unknown engine "${engine}". Use pdfjs or pdf-parse.`);
      }
      opts.engine = engine;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`compilePerfectSrd — wipe data/srd/ and rebuild 3 unified macro-files

Step 1: Delete everything under data/srd/ (bundles, micro-files, srd_database.json)
        Source PDF in data/srd-source/ is NEVER touched.

Step 2: Compile exactly:
        create_a_character.json
        gameplay_mechanics.json
        fighter.json

Options:
  --dry-run       Log purge plan + anchors; do not delete or write
  --skip-purge    Skip wipe (compile only)
  --pdf <path>    PDF source (default: data/srd-source/SRD_CC_v5.2.1.pdf)
  --out <dir>     Output directory (default: data/srd/macro)
  --quiet         Reduce per-page logging
  --help          Show this help
`);
}

function logHeader(message: string): void {
  console.log(`\n=== ${message} ===`);
}

async function ensurePdfExists(pdfPath: string): Promise<void> {
  try {
    await access(pdfPath, constants.R_OK);
  } catch {
    throw new Error(`Source PDF not found at ${pdfPath}`);
  }
}

async function listAllFiles(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listAllFiles(full, base)));
    } else if (entry.isFile()) {
      out.push(relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

async function purgeSrdDataRoot(dryRun: boolean): Promise<string[]> {
  const existing = await listAllFiles(SRD_DATA_ROOT);
  logHeader("Step 1 — Purge data/srd/");
  if (existing.length === 0) {
    console.log("  (already empty)");
    return [];
  }

  for (const rel of existing.sort()) {
    console.log(`  ${dryRun ? "WOULD DELETE" : "DELETE"}  data/srd/${rel}`);
  }

  if (!dryRun) {
    const entries = await readdir(SRD_DATA_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      await rm(join(SRD_DATA_ROOT, entry.name), { recursive: true, force: true });
    }
  }

  return existing;
}

async function extractPdfText(opts: CliOptions): Promise<string> {
  let lastLoggedPct = -1;
  const pages = await extractPdfPages({
    pdfPath: opts.pdfPath,
    engine: opts.engine,
    onPage: opts.verbose
      ? (page, index, total) => {
          const pct = Math.floor(((index + 1) / total) * 100);
          if (pct >= lastLoggedPct + 15 || index === 0 || index + 1 === total) {
            console.log(`  Page ${page.pageNumber}/${total} (${pct}%)`);
            lastLoggedPct = pct;
          }
        }
      : undefined,
  });

  return stripTableOfContents(cleanPdfText(joinPages(pages)));
}

function attachPdfBoundary<T extends Record<string, unknown>>(
  macro: T,
  boundary: AnchorBoundary | undefined,
): T & { pdfBoundary?: AnchorBoundary } {
  if (!boundary) return macro;
  return { ...macro, pdfBoundary: boundary };
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function countMicroFiles(files: string[]): number {
  const unified = new Set(UNIFIED_MACRO_FILES);
  return files.filter((f) => f.endsWith(".json") && !unified.has(f as (typeof UNIFIED_MACRO_FILES)[number])).length;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  await ensurePdfExists(opts.pdfPath);

  logHeader("compilePerfectSrd");
  console.log(`Source PDF:  ${opts.pdfPath} (read-only)`);
  console.log(`Output dir:  ${opts.outDir}`);
  console.log(`Mode:        ${opts.dryRun ? "DRY RUN" : "COMPILE"}`);

  if (!opts.skipPurge) {
    await purgeSrdDataRoot(opts.dryRun);
  } else {
    logHeader("Step 1 — Purge skipped (--skip-purge)");
  }

  logHeader("Step 2 — PDF anchor boundaries");
  const pdfText = await extractPdfText(opts);
  console.log(`  Stream chars: ${pdfText.length.toLocaleString()}`);

  const boundaries = detectAllAnchorBoundaries(pdfText);
  logAnchorBoundaries(boundaries);

  const required = ["character_creation", "fighter", "gameplay_mechanics"] as const;
  const boundaryById = Object.fromEntries(boundaries.map((b) => [b.id, b]));
  for (const id of required) {
    if (!boundaryById[id]) {
      throw new Error(`Missing PDF anchor boundary for "${id}" — check source PDF.`);
    }
  }

  logHeader("Step 2 — Build unified macros (full text, no truncation)");
  const corpus = await loadSrdCorpus();

  const createACharacter = attachPdfBoundary(
    buildCreateACharacterMacro(corpus),
    boundaryById.character_creation,
  );
  const fighter = attachPdfBoundary(buildPlayerClassMacro(corpus, "fighter")!, boundaryById.fighter);
  const gameplayMechanics = attachPdfBoundary(
    buildGameplayMechanicsMacro(corpus),
    boundaryById.gameplay_mechanics,
  );

  if (!fighter) {
    throw new Error("Fighter macro build failed.");
  }
  fighter.outputFile = "fighter.json";

  console.log(`  create_a_character: ${createACharacter.sectionCount} nested steps, ${createACharacter.markdown.length.toLocaleString()} chars`);
  console.log(`  fighter:            ${fighter.sectionCount} sections, ${fighter.subclasses.length} subclass(s), ${fighter.markdown.length.toLocaleString()} chars`);
  console.log(`  gameplay_mechanics: ${Object.keys(gameplayMechanics.lookup).length} lookup entries, ${gameplayMechanics.markdown.length.toLocaleString()} chars`);

  if (opts.dryRun) {
    logHeader("Dry run — no files written");
    console.log(`Would write ${UNIFIED_MACRO_FILES.length} files to ${opts.outDir}`);
    return;
  }

  await writeJson(join(opts.outDir, "create_a_character.json"), createACharacter);
  await writeJson(join(opts.outDir, "fighter.json"), fighter);
  await writeJson(join(opts.outDir, "gameplay_mechanics.json"), gameplayMechanics);

  const outputFiles = await listAllFiles(opts.outDir);
  const microRemaining = countMicroFiles(outputFiles);

  logHeader("Verification");
  for (const name of UNIFIED_MACRO_FILES) {
    console.log(`  ✓ ${name}`);
  }

  console.log(
    `\nSuccessfully created ${UNIFIED_MACRO_FILES.length} unified macro-files. ${microRemaining} micro-files remain.`,
  );

  if (microRemaining > 0) {
    console.error("Unexpected micro-files detected:");
    for (const f of outputFiles.filter((x) => !UNIFIED_MACRO_FILES.includes(x as (typeof UNIFIED_MACRO_FILES)[number]))) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
