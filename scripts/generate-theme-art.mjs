import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "themes");

const THEME_IDS = [
  "wanderers-journal",
  "iron-tome",
  "arcane-library",
  "royal-keep",
];

const PROMPTS = {
  "wanderers-journal": {
    banner:
      "Wide horizontal banner, leather journal on wooden prep table, warm parchment pages, ink quill, muted gold accents, atmospheric D&D tabletop, no text, no people",
    sign: "Weathered leather journal cover with brass clasp, warm parchment tones, empty center for title, no letters, illustration",
  },
  "iron-tome": {
    banner:
      "Wide horizontal banner, iron-bound tome on dark stone, deep crimson cloth, muted gold filigree, torch shadows, D&D aesthetic, no text",
    sign: "Iron-studded book cover with deep red leather and dull gold corners, empty center for title, no letters, illustration",
  },
  "arcane-library": {
    banner:
      "Wide horizontal banner, arcane library vault, cool blue-violet glow, floating runes, crystal light on dark shelves, no text",
    sign: "Crystal-framed sign with glowing arcane runes at border, cool indigo palette, empty center, no letters, illustration",
  },
  "royal-keep": {
    banner:
      "Wide horizontal banner, stone keep war room, warm torchlight, hanging banners, carved battlements, muted gold trim, no text",
    sign: "Stone shield plaque with banner cloth and warm gold trim, empty center for title, no letters, illustration",
  },
};

function loadEnvFile(name) {
  const path = join(ROOT, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY — set it in .env.local then re-run.");
  process.exit(1);
}

const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

async function generateImage(prompt, size) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality: "medium",
      n: 1,
      moderation: "low",
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `HTTP ${response.status}`);
  }
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return Buffer.from(b64, "base64");
}

mkdirSync(OUT_DIR, { recursive: true });

const only = process.argv.find((a) => a.startsWith("--theme="))?.slice(8);
const slots = process.argv.includes("--sign-only")
  ? ["sign"]
  : process.argv.includes("--banner-only")
    ? ["banner"]
    : ["banner", "sign"];

const ids = only ? [only] : THEME_IDS;
const manifest = { generatedAt: new Date().toISOString(), themes: {} };

for (const id of ids) {
  if (!PROMPTS[id]) {
    console.warn(`Unknown theme: ${id}`);
    continue;
  }
  manifest.themes[id] = {};
  for (const slot of slots) {
    const prompt = PROMPTS[id][slot];
    const size = slot === "banner" ? "1536x1024" : "1024x1024";
    console.log(`Generating ${id} ${slot}…`);
    try {
      const png = await generateImage(prompt, size);
      const file = `${id}-${slot}.png`;
      writeFileSync(join(OUT_DIR, file), png);
      manifest.themes[id][slot] = file;
      console.log(`  wrote public/themes/${file}`);
    } catch (err) {
      console.error(`  failed ${id} ${slot}:`, err.message || err);
    }
  }
}

writeFileSync(join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Done.");
