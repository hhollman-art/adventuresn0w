import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanPdfText, extractPdfPages, joinPages, type PdfEngine } from "./srd-pdf/extractPages.js";
import { HeaderStackBuffer } from "./srd-macro/headerStack.js";
import { loadSrdCorpus } from "./srd-macro/corpus.js";
import {
  buildAllPlayerClassMacros,
  buildCreateACharacterMacro,
  buildGameplayMechanicsMacro,
  summarizeMacros,
} from "./srd-macro/buildMacroBundles.js";
import type { MacroManifest } from "./srd-macro/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type CliOptions = {
  outDir: string;
  dryRun: boolean;
  verbose: boolean;
  writeMd: boolean;
  pdfPath: string | null;
  engine: PdfEngine;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    outDir: join(ROOT, "data", "srd", "macro"),
    dryRun: false,
    verbose: true,
    writeMd: false,
    pdfPath: null,
    engine: "pdfjs",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--quiet") opts.verbose = false;
    else if (arg === "--md") opts.writeMd = true;
    else if (arg === "--out") opts.outDir = resolve(argv[++i] ?? opts.outDir);
    else if (arg === "--pdf") opts.pdfPath = resolve(argv[++i] ?? "");
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
  console.log(`SRD macro consolidation — header-scoped unified rule files

Outputs (default: data/srd/macro/):
  create_a_character.json     Single chronological creation flow (no micro-files)
  classes/{class}.json        One unified file per player class
  gameplay_mechanics.json     Combat actions + rules glossary + core mechanics
  manifest.json

Options:
  --out <dir>       Output directory
  --dry-run         Log counts only; do not write files
  --md              Also write .md mirrors alongside .json
  --pdf <path>      Stream PDF text through header stack (diagnostic logging)
  --engine pdfjs    PDF extraction engine (with --pdf)
  --quiet           Reduce logging
  --help            Show this help

Primary source: bundled SRD markdown corpus (srdDocument.data.ts + index).
PDF streaming demonstrates header-buffer stacking; corpus provides high-fidelity output.

Usage:
  npm run consolidate:srd-macro
  npm run consolidate:srd-macro -- --dry-run
  npm run consolidate:srd-macro -- --pdf data/srd-source/SRD_CC_v5.2.1.pdf
`);
}

function logHeader(message: string): void {
  console.log(`\n=== ${message} ===`);
}

async function maybeStreamPdf(pdfPath: string, engine: PdfEngine, verbose: boolean): Promise<void> {
  try {
    await access(pdfPath, constants.R_OK);
  } catch {
    console.warn(`  PDF not found at ${pdfPath} — skipping stream demo.`);
    return;
  }

  logHeader("PDF header-stack stream (diagnostic)");
  const flushedByKey = new Map<string, number>();
  const stack = new HeaderStackBuffer({
    minBoundaryLevel: 2,
    onFlush: (section) => {
      flushedByKey.set(section.key, (flushedByKey.get(section.key) ?? 0) + 1);
    },
  });

  let lastLoggedPct = -1;
  const pages = await extractPdfPages({
    pdfPath,
    engine,
    onPage: verbose
      ? (page, index, total) => {
          const pct = Math.floor(((index + 1) / total) * 100);
          if (pct >= lastLoggedPct + 20 || index === 0 || index + 1 === total) {
            console.log(`  Page ${page.pageNumber}/${total} (${pct}%)`);
            lastLoggedPct = pct;
          }
        }
      : undefined,
  });

  const joined = cleanPdfText(joinPages(pages));
  for (const page of pages) {
    stack.notePage(page.pageNumber);
    stack.pushChunk(`<!-- page:${page.pageNumber} -->\n${page.text}`);
  }
  const flushed = stack.finish();

  console.log(`  Pages streamed: ${pages.length.toLocaleString()}`);
  console.log(`  Header sections flushed: ${flushed.length.toLocaleString()}`);
  console.log(`  Unique section keys: ${flushedByKey.size.toLocaleString()}`);
  if (flushed[0]) {
    console.log(`  First section: ${flushed[0].title} (page ${flushed[0].pageNumber ?? "?"})`);
  }
}

async function writeJson(path: string, data: unknown, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeOptionalMd(path: string, markdown: string, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${markdown.trim()}\n`, "utf8");
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.pdfPath) {
    await maybeStreamPdf(opts.pdfPath, opts.engine, opts.verbose);
  }

  logHeader("Loading bundled SRD corpus");
  const corpus = await loadSrdCorpus();
  console.log(`  Document: ${corpus.documentPdfId}`);
  console.log(`  Index rows: ${corpus.index.length.toLocaleString()}`);
  console.log(`  Body chars: ${corpus.body.length.toLocaleString()}`);

  logHeader("Building macro-scoped bundles (header boundaries)");
  const createACharacter = buildCreateACharacterMacro(corpus);
  const playerClasses = buildAllPlayerClassMacros(corpus);
  const gameplayMechanics = buildGameplayMechanicsMacro(corpus);
  const summary = summarizeMacros(createACharacter, playerClasses, gameplayMechanics);

  logHeader("Macro counts");
  console.log(`  create_a_character sections: ${summary.creationStepCount}`);
  console.log(`  player class files:          ${summary.classFileCount}`);
  console.log(`  gameplay_mechanics entries:  ${summary.gameplayEntryCount}`);
  console.log(`  combat [Action] entries:     ${gameplayMechanics.combatActions.length}`);
  console.log(`  glossary entries:            ${gameplayMechanics.glossary.length}`);

  if (opts.verbose) {
    console.log("\n  Class section counts:");
    for (const [classKey, count] of Object.entries(summary.classSectionCounts)) {
      console.log(`    ${classKey.padEnd(12)} ${count}`);
    }
  }

  const classOutputs = playerClasses.map((c) => c.outputFile);
  const manifest: MacroManifest = {
    edition: corpus.edition,
    documentPdfId: corpus.documentPdfId,
    parsedAt: new Date().toISOString(),
    source: opts.pdfPath ? "hybrid" : "bundled-corpus",
    outputs: {
      create_a_character: "create_a_character.json",
      gameplay_mechanics: "gameplay_mechanics.json",
      classes: classOutputs,
    },
    counts: {
      creationSteps: summary.creationStepCount,
      classFiles: summary.classFileCount,
      gameplayEntries: summary.gameplayEntryCount,
    },
  };

  if (opts.dryRun) {
    logHeader("Dry run — no files written");
    console.log(`Would write to: ${opts.outDir}`);
    return;
  }

  const outDir = opts.outDir;
  await writeJson(join(outDir, "create_a_character.json"), createACharacter, false);
  await writeJson(join(outDir, "gameplay_mechanics.json"), gameplayMechanics, false);
  await writeJson(join(outDir, "manifest.json"), manifest, false);

  for (const classMacro of playerClasses) {
    await writeJson(join(outDir, classMacro.outputFile), classMacro, false);
  }

  if (opts.writeMd) {
    await writeOptionalMd(join(outDir, "create_a_character.md"), createACharacter.markdown, false);
    await writeOptionalMd(join(outDir, "gameplay_mechanics.md"), gameplayMechanics.markdown, false);
    for (const classMacro of playerClasses) {
      await writeOptionalMd(join(outDir, classMacro.outputFile.replace(/\.json$/, ".md")), classMacro.markdown, false);
    }
  }

  logHeader("Done");
  console.log(`Wrote macro bundles to ${outDir}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
