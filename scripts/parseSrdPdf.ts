#!/usr/bin/env node
/**
 * Parse SRD_CC_v5.2.1.pdf into unified high-density JSON (srd_database.json).
 *
 * Usage:
 *   npm run parse:srd-pdf -- --dry-run
 *   npm run parse:srd-pdf -- --pdf data/srd-source/SRD_CC_v5.2.1.pdf
 *   npm run parse:srd-pdf -- --engine pdf-parse
 *
 * Default input:  data/srd-source/SRD_CC_v5.2.1.pdf
 * Default output: data/srd/srd_database.json
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanPdfText, extractPdfPages, joinPages, type PdfEngine } from "./srd-pdf/extractPages.js";
import {
  parseCharacterCreationSteps,
  parseSystemRules,
  summarizeDetectedSections,
  attachPageStats,
  stripTableOfContents,
} from "./srd-pdf/parseSections.js";
import { parseSpells } from "./srd-pdf/parseSpells.js";
import { mergePdfWithBundled } from "./srd-pdf/buildFromBundledCorpus.js";
import type { SrdDatabase } from "./srd-pdf/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type CliOptions = {
  pdfPath: string;
  outPath: string;
  engine: PdfEngine;
  dryRun: boolean;
  verbose: boolean;
  hybrid: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    pdfPath: join(ROOT, "data", "srd-source", "SRD_CC_v5.2.1.pdf"),
    outPath: join(ROOT, "data", "srd", "srd_database.json"),
    engine: "pdfjs",
    dryRun: false,
    verbose: true,
    hybrid: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--no-hybrid") opts.hybrid = false;
    else if (arg === "--quiet") opts.verbose = false;
    else if (arg === "--pdf") opts.pdfPath = resolve(argv[++i] ?? opts.pdfPath);
    else if (arg === "--out") opts.outPath = resolve(argv[++i] ?? opts.outPath);
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
  console.log(`SRD PDF parser — SRD_CC_v5.2.1 → srd_database.json

Options:
  --pdf <path>       Input PDF (default: data/srd-source/SRD_CC_v5.2.1.pdf)
  --out <path>       Output JSON (default: data/srd/srd_database.json)
  --engine pdfjs     Page-by-page extraction (default, memory-safe)
  --engine pdf-parse Whole-document extraction via pdf-parse
  --dry-run          Log stats only; do not write output file
  --no-hybrid        Disable bundled-markdown fallback when PDF parse yield is low
  --quiet            Reduce per-page logging
  --help             Show this help

Install:
  npm install pdfjs-dist pdf-parse
  npm install -D tsx @types/pdf-parse
`);
}

async function ensurePdfExists(pdfPath: string): Promise<void> {
  try {
    await access(pdfPath, constants.R_OK);
  } catch {
    throw new Error(
      `PDF not found at ${pdfPath}\nPlace SRD_CC_v5.2.1.pdf in data/srd-source/ or pass --pdf <path>.`,
    );
  }
}

function logHeader(message: string): void {
  console.log(`\n=== ${message} ===`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  await ensurePdfExists(opts.pdfPath);

  logHeader("SRD PDF extraction");
  console.log(`Source: ${opts.pdfPath}`);
  console.log(`Engine: ${opts.engine}`);
  console.log(`Dry run: ${opts.dryRun ? "yes" : "no"}`);

  let lastLoggedPct = -1;
  const pages = await extractPdfPages({
    pdfPath: opts.pdfPath,
    engine: opts.engine,
    onPage: opts.verbose
      ? (page, index, total) => {
          const pct = Math.floor(((index + 1) / total) * 100);
          if (pct >= lastLoggedPct + 10 || index === 0 || index + 1 === total) {
            console.log(
              `  Page ${page.pageNumber}/${total} (${pct}%) — ${page.charCount.toLocaleString()} chars`,
            );
            lastLoggedPct = pct;
          }
        }
      : undefined,
  });

  const { pageCount, charCount } = attachPageStats(pages);
  logHeader("Extraction complete");
  console.log(`Pages: ${pageCount.toLocaleString()}`);
  console.log(`Characters extracted: ${charCount.toLocaleString()}`);

  const joined = stripTableOfContents(cleanPdfText(joinPages(pages)));
  const chapters = summarizeDetectedSections(joined);

  logHeader("Section detection (content anchors, TOC stripped)");
  if (chapters.length === 0) {
    console.warn("  No sections found — check PDF layout or anchor patterns.");
  } else {
    for (const chapter of chapters) {
      console.log(`  ${chapter.title.padEnd(24)} ${chapter.chars.toLocaleString()} chars`);
    }
  }

  let steps = parseCharacterCreationSteps(joined);
  let spells = parseSpells(joined);
  let systemRules = parseSystemRules(joined);

  if (opts.hybrid) {
    const merged = await mergePdfWithBundled({
      create_a_character: {
        title: "Character Creation",
        description: "",
        steps,
      },
      spells,
      system_rules: systemRules,
    });
    if (merged.create_a_character.steps.length !== steps.length) {
      console.log("  Hybrid: using bundled markdown for create_a_character steps");
    }
    if (merged.spells.length !== spells.length) {
      console.log(`  Hybrid: using bundled markdown for spells (${merged.spells.length})`);
    }
    if (merged.system_rules.length !== systemRules.length) {
      console.log(`  Hybrid: using bundled markdown for system_rules (${merged.system_rules.length})`);
    }
    steps = merged.create_a_character.steps;
    spells = merged.spells;
    systemRules = merged.system_rules;
  }

  logHeader("Taxonomy counts");
  console.log(`  create_a_character steps: ${steps.length}`);
  console.log(`  spells:                   ${spells.length}`);
  console.log(`  system_rules:             ${systemRules.length}`);

  if (steps.length > 0) {
    console.log(`  First creation step:      ${steps[0].title}`);
  }
  if (spells.length > 0) {
    console.log(`  First spell:              ${spells[0].name} (${spells[0].levelLabel})`);
  }
  if (systemRules.length > 0) {
    console.log(`  First system rule:        ${systemRules[0].slug}`);
  }

  const database: SrdDatabase = {
    meta: {
      sourcePdf: opts.pdfPath,
      edition: "5.2.1",
      documentPdfId: "SRD_CC_v5.2.1",
      parsedAt: new Date().toISOString(),
      pageCount,
      charCount: joined.length,
      engine: opts.engine,
      dryRun: opts.dryRun,
    },
    create_a_character: {
      title: "Character Creation",
      description:
        "Sequential character creation steps extracted from the SRD PDF and merged chronologically.",
      steps,
    },
    spells,
    system_rules: systemRules,
  };

  if (opts.dryRun) {
    logHeader("Dry run — no file written");
    console.log(`Would write: ${opts.outPath}`);
    return;
  }

  await mkdir(dirname(opts.outPath), { recursive: true });
  await writeFile(opts.outPath, `${JSON.stringify(database, null, 2)}\n`, "utf8");

  logHeader("Done");
  console.log(`Wrote ${opts.outPath}`);
  console.log(`Total JSON size: ${JSON.stringify(database).length.toLocaleString()} chars`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
