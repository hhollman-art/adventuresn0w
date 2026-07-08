#!/usr/bin/env node
/**
 * Build unified SRD macro files from SRD_CC_v5.2.1.pdf + bundled corpus.
 *
 * Outputs (data/srd/macro/):
 *   create_a_character.json  — full PC creation flow (no micro-files)
 *   fighter.json             — unified Fighter class + subclasses + features
 *   gameplay_mechanics.json  — glossary, conditions, combat actions + lookup map
 *
 * Boundaries: text anchors in PDF stream (not page counts).
 * Content: bundled markdown corpus (full tables/text); PDF validates anchor spans.
 *
 * Usage:
 *   npm run build:macro-srd -- --dry-run
 *   npm run build:macro-srd
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
import type { MacroManifest } from "./srd-macro/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_PDF = join(ROOT, "data", "srd-source", "SRD_CC_v5.2.1.pdf");
const DEFAULT_OUT = join(ROOT, "data", "srd", "macro");

type CliOptions = {
  pdfPath: string;
  outDir: string;
  engine: PdfEngine;
  dryRun: boolean;
  verbose: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    pdfPath: DEFAULT_PDF,
    outDir: DEFAULT_OUT,
    engine: "pdfjs",
    dryRun: false,
    verbose: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
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
  console.log(`buildMacroSrd — unified SRD macro extraction

Outputs:
  create_a_character.json   Sequential creation (species, scores, feat, armor, …)
  fighter.json              Full Fighter class + progression + all subclasses
  gameplay_mechanics.json   Conditions, combat actions, glossary lookup map

Options:
  --pdf <path>     PDF source (default: data/srd-source/SRD_CC_v5.2.1.pdf)
  --out <dir>      Output directory (default: data/srd/macro)
  --dry-run        Log anchor boundaries and counts only; do not write files
  --engine pdfjs   Page-by-page PDF extraction (default)
  --quiet          Reduce per-page logging
  --help           Show this help

Example:
  npm run build:macro-srd -- --dry-run
  npm run build:macro-srd
`);
}

function logHeader(message: string): void {
  console.log(`\n=== ${message} ===`);
}

async function ensurePdfExists(pdfPath: string): Promise<void> {
  try {
    await access(pdfPath, constants.R_OK);
  } catch {
    throw new Error(`PDF not found at ${pdfPath}`);
  }
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

  const joined = stripTableOfContents(cleanPdfText(joinPages(pages)));
  logHeader("PDF stream loaded");
  console.log(`  Pages: ${pages.length}`);
  console.log(`  Characters: ${joined.length.toLocaleString()}`);
  return joined;
}

function attachPdfBoundaries<T extends Record<string, unknown>>(
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

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  await ensurePdfExists(opts.pdfPath);

  logHeader("SRD macro extraction");
  console.log(`PDF: ${opts.pdfPath}`);
  console.log(`Dry run: ${opts.dryRun ? "yes" : "no"}`);

  const pdfText = await extractPdfText(opts);
  const boundaries = detectAllAnchorBoundaries(pdfText);
  logAnchorBoundaries(boundaries);

  const boundaryById = Object.fromEntries(boundaries.map((b) => [b.id, b])) as Record<
    string,
    AnchorBoundary | undefined
  >;

  logHeader("Loading bundled corpus (high-fidelity content)");
  const corpus = await loadSrdCorpus();

  const createACharacter = attachPdfBoundaries(
    buildCreateACharacterMacro(corpus),
    boundaryById.character_creation,
  );
  const fighter = attachPdfBoundaries(buildPlayerClassMacro(corpus, "fighter")!, boundaryById.fighter);
  const gameplayMechanics = attachPdfBoundaries(
    buildGameplayMechanicsMacro(corpus),
    boundaryById.gameplay_mechanics,
  );

  if (!fighter) {
    throw new Error("Fighter class macro could not be built from corpus index.");
  }

  fighter.outputFile = "fighter.json";

  logHeader("Macro file summary");
  console.log(`  create_a_character.json`);
  console.log(`    nested steps:     ${createACharacter.sectionCount}`);
  console.log(`    markdown chars:   ${createACharacter.markdown.length.toLocaleString()}`);
  console.log(`  fighter.json`);
  console.log(`    sections:         ${fighter.sectionCount}`);
  console.log(`    subclasses:       ${fighter.subclasses.length}`);
  console.log(`    markdown chars:   ${fighter.markdown.length.toLocaleString()}`);
  console.log(`  gameplay_mechanics.json`);
  console.log(`    lookup entries:   ${Object.keys(gameplayMechanics.lookup).length}`);
  console.log(`    combat actions:   ${gameplayMechanics.combatActions.length}`);
  console.log(`    conditions:       ${Object.values(gameplayMechanics.lookup).filter((e) => e.kind === "condition").length}`);
  console.log(`    markdown chars:   ${gameplayMechanics.markdown.length.toLocaleString()}`);

  const manifest: MacroManifest = {
    edition: corpus.edition,
    documentPdfId: corpus.documentPdfId,
    parsedAt: new Date().toISOString(),
    source: "hybrid",
    outputs: {
      create_a_character: "create_a_character.json",
      gameplay_mechanics: "gameplay_mechanics.json",
      classes: ["fighter.json"],
    },
    counts: {
      creationSteps: createACharacter.sectionCount,
      classFiles: 1,
      gameplayEntries: gameplayMechanics.entryCount,
    },
  };

  if (opts.dryRun) {
    logHeader("Dry run — no files written");
    console.log(`Would write to: ${opts.outDir}`);
    return;
  }

  await writeJson(join(opts.outDir, "create_a_character.json"), createACharacter);
  await writeJson(join(opts.outDir, "fighter.json"), fighter);
  await writeJson(join(opts.outDir, "gameplay_mechanics.json"), gameplayMechanics);
  await writeJson(join(opts.outDir, "manifest.json"), manifest);

  logHeader("Done");
  console.log(`Wrote macro files to ${opts.outDir}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
