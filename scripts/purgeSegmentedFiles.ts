#!/usr/bin/env node
/**
 * Purge hyper-segmented SRD micro-files using a strict whitelist.
 *
 * Default target: data/srd/macro/
 * Backup:         _srd_clutter_backup/ (project root, outside source tree)
 *
 * Usage:
 *   npm run purge:segmented-srd              # dry run (default)
 *   npm run purge:segmented-srd -- --force   # backup + delete
 */

import {
  access,
  copyFile,
  mkdir,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PLAYER_CLASS_KEYS } from "./srd-macro/taxonomy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** Master macro files — only these basenames at the TARGET ROOT are kept. */
const WHITELIST_ROOT_FILES = new Set([
  "create_a_character.json",
  "gameplay_mechanics.json",
  "spells.json",
  "monsters.json",
  ...PLAYER_CLASS_KEYS.map((key) => `${key}.json`),
]);

const SEGMENTED_EXTENSIONS = new Set([".json", ".md", ".markdown"]);

type CliOptions = {
  targetDir: string;
  backupDir: string;
  force: boolean;
  pruneEmptyDirs: boolean;
};

type FilePlan = {
  absolutePath: string;
  relativePath: string;
  action: "keep" | "delete";
  reason: string;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    targetDir: join(ROOT, "data", "srd", "macro"),
    backupDir: join(ROOT, "_srd_clutter_backup"),
    force: false,
    pruneEmptyDirs: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") opts.force = true;
    else if (arg === "--no-prune-dirs") opts.pruneEmptyDirs = false;
    else if (arg === "--dir") opts.targetDir = resolve(argv[++i] ?? opts.targetDir);
    else if (arg === "--backup") opts.backupDir = resolve(argv[++i] ?? opts.backupDir);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`purgeSegmentedFiles — whitelist purge for SRD macro directory

Keeps ONLY unified master files at the target root:
  create_a_character.json, gameplay_mechanics.json, spells.json, monsters.json
  barbarian.json … wizard.json (12 PC classes)

Deletes all other .json / .md files (including classes/*.json micro-layout).

Options:
  --dir <path>       Target directory (default: data/srd/macro)
  --backup <path>    Backup root (default: _srd_clutter_backup/)
  --force            Backup then delete (default: dry run only)
  --no-prune-dirs    Leave empty directories after purge
  --help             Show this help

Examples:
  npm run purge:segmented-srd
  npm run purge:segmented-srd -- --force
`);
}

function logHeader(message: string): void {
  console.log(`\n=== ${message} ===`);
}

function isSegmentedCandidate(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return SEGMENTED_EXTENSIONS.has(ext);
}

function classifyFile(targetDir: string, absolutePath: string): FilePlan {
  const rel = relative(targetDir, absolutePath).replace(/\\/g, "/");
  const name = basename(absolutePath);
  const isRoot = !rel.includes("/");

  if (!isSegmentedCandidate(name)) {
    return {
      absolutePath,
      relativePath: rel,
      action: "keep",
      reason: "not .json/.md — skipped",
    };
  }

  if (isRoot && WHITELIST_ROOT_FILES.has(name)) {
    return {
      absolutePath,
      relativePath: rel,
      action: "keep",
      reason: "whitelisted master macro file",
    };
  }

  if (!isRoot) {
    return {
      absolutePath,
      relativePath: rel,
      action: "delete",
      reason: "segmented file outside macro root (subfolder micro-file)",
    };
  }

  return {
    absolutePath,
    relativePath: rel,
    action: "delete",
    reason: "non-whitelisted segmented file at macro root",
  };
}

async function walkFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function ensureTargetExists(targetDir: string): Promise<void> {
  try {
    await access(targetDir, constants.R_OK);
  } catch {
    throw new Error(`Target directory not found: ${targetDir}`);
  }
}

async function backupFile(
  sourcePath: string,
  targetDir: string,
  backupDir: string,
): Promise<string> {
  const rel = relative(targetDir, sourcePath).replace(/\\/g, "/");
  const dest = join(backupDir, rel);
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(sourcePath, dest);
  return dest;
}

async function pruneEmptyDirectories(targetDir: string): Promise<string[]> {
  const removed: string[] = [];

  async function walk(dir: string): Promise<boolean> {
    const entries = await readdir(dir, { withFileTypes: true });
    let hasContent = false;

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const childHasContent = await walk(full);
        if (!childHasContent) {
          await rm(full, { recursive: true, force: true });
          removed.push(relative(targetDir, full).replace(/\\/g, "/"));
        } else {
          hasContent = true;
        }
      } else {
        hasContent = true;
      }
    }

    return hasContent;
  }

  await walk(targetDir);
  return removed;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  await ensureTargetExists(opts.targetDir);

  logHeader("SRD macro purge — whitelist strategy");
  console.log(`Target:  ${opts.targetDir}`);
  console.log(`Backup:  ${opts.backupDir}`);
  console.log(`Mode:    ${opts.force ? "FORCE (backup + delete)" : "DRY RUN"}`);

  const allFiles = await walkFiles(opts.targetDir);
  const plans = allFiles.map((file) => classifyFile(opts.targetDir, file));

  const toKeep = plans.filter((p) => p.action === "keep" && isSegmentedCandidate(basename(p.absolutePath)));
  const toDelete = plans.filter((p) => p.action === "delete");
  const skipped = plans.filter((p) => p.action === "keep" && !isSegmentedCandidate(basename(p.absolutePath)));

  logHeader(`Protected master files (${toKeep.length})`);
  if (toKeep.length === 0) {
    console.log("  (none found — check that build:macro-srd has run)");
  } else {
    for (const plan of toKeep.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
      console.log(`  KEEP  ${plan.relativePath}`);
    }
  }

  logHeader(`Targeted for deletion (${toDelete.length})`);
  if (toDelete.length === 0) {
    console.log("  (nothing to purge — directory is clean)");
  } else {
    for (const plan of toDelete.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
      console.log(`  DEL   ${plan.relativePath.padEnd(36)} # ${plan.reason}`);
    }
  }

  if (skipped.length > 0) {
    logHeader(`Skipped non-json/md (${skipped.length})`);
    for (const plan of skipped) {
      console.log(`  SKIP  ${plan.relativePath}`);
    }
  }

  if (!opts.force) {
    logHeader("Dry run complete — no files deleted");
    console.log("Re-run with --force to backup and delete targeted files:");
    console.log("  npm run purge:segmented-srd -- --force");
    return;
  }

  if (toDelete.length === 0) {
    logHeader("Nothing to delete");
    return;
  }

  logHeader("Backing up targeted files");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRunDir = join(opts.backupDir, timestamp);
  await mkdir(backupRunDir, { recursive: true });

  const manifest: Array<{ relativePath: string; reason: string; backupPath: string }> = [];

  for (const plan of toDelete) {
    const backupPath = await backupFile(plan.absolutePath, opts.targetDir, backupRunDir);
    manifest.push({
      relativePath: plan.relativePath,
      reason: plan.reason,
      backupPath: relative(ROOT, backupPath).replace(/\\/g, "/"),
    });
    console.log(`  backed up ${plan.relativePath}`);
  }

  await writeFile(
    join(backupRunDir, "_manifest.json"),
    `${JSON.stringify({ purgedAt: new Date().toISOString(), targetDir: opts.targetDir, files: manifest }, null, 2)}\n`,
    "utf8",
  );

  logHeader("Deleting targeted files");
  for (const plan of toDelete) {
    await rm(plan.absolutePath, { force: true });
    console.log(`  deleted ${plan.relativePath}`);
  }

  if (opts.pruneEmptyDirs) {
    logHeader("Pruning empty directories");
    const removed = await pruneEmptyDirectories(opts.targetDir);
    if (removed.length === 0) {
      console.log("  (none)");
    } else {
      for (const dir of removed.sort()) {
        console.log(`  removed ${dir}/`);
      }
    }
  }

  logHeader("Purge complete");
  console.log(`Backup saved to: ${backupRunDir}`);
  console.log(`Deleted ${toDelete.length} file(s); kept ${toKeep.length} master file(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
