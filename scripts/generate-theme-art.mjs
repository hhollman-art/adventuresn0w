import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "themes");

const THEME_IDS = [
  "forest",
  "dragon-den",
  "thieves-guild",
  "paladin-citadel",
  "ice-tower",
  "pirates",
  "hades",
  "astral",
];

const PROMPTS = {
  forest: {
    banner:
      "Wide cinematic fantasy art banner, moonlit enchanted dark forest clearing, ancient oaks with moss and hanging vines, fireflies, torch-gold dappled light, deep emerald and brown palette, no text, no people, painterly D&D tabletop aesthetic, horizontal composition",
    sign: "Fantasy wooden tavern sign plank texture, weathered dark oak with moss at edges, carved frame, empty center for text overlay, torchlit warm gold highlights, top-down flat view of sign board, no letters, no people, illustration",
  },
  "dragon-den": {
    banner:
      "Wide cinematic fantasy cavern banner, blue dragon lair, sapphire crystal clusters, lightning reflections on wet stone, coin hoard glints, electric cyan and deep navy palette, no text, painterly D&D aesthetic, horizontal",
    sign: "Fantasy stone tablet sign with dragon scale inlay border, cracked obsidian and sapphire gems, empty flat center panel for title text, cool blue glow, no letters, illustration",
  },
  "thieves-guild": {
    banner:
      "Wide cinematic fantasy alley at night, thieves guild hideout, brick walls, warm lantern glow, shadowy rooftops, crimson and charcoal palette, fog, no text, painterly D&D aesthetic, horizontal banner",
    sign: "Fantasy worn iron sign board with rivets on dark wood, subtle mask silhouette carved in corners, empty center, amber lantern light, no letters, illustration",
  },
  "paladin-citadel": {
    banner:
      "Wide cinematic fantasy paladin citadel at sunrise, white marble battlements, blue sky, holy gold pennants, sun rays, silver and sky-blue palette, no text, painterly D&D aesthetic, horizontal",
    sign: "Fantasy white marble shield-shaped sign with gold trim and blue enamel, empty center for title, radiant holy light, no letters, illustration",
  },
  "ice-tower": {
    banner:
      "Wide cinematic fantasy ice wizard tower, aurora borealis, frost spire, swirling snow, arcane cyan sigils in air, pale blue and silver palette, no text, painterly D&D aesthetic, horizontal",
    sign: "Fantasy frosted crystal sign frame with icicle edges, empty frosted glass center panel, aurora reflections, no letters, illustration",
  },
  pirates: {
    banner:
      "Wide cinematic fantasy pirate ship deck at moonlit sea, timber rails, rope coils, treasure map corner, ocean navy and weathered gold palette, salt spray, no text, painterly D&D aesthetic, horizontal",
    sign: "Fantasy weathered ship plank sign with rope border and brass nails, empty center, moonlit teal highlights, no letters, illustration",
  },
  hades: {
    banner:
      "Wide cinematic fantasy River Styx landscape, obsidian cliffs, ember-orange lava rivers, ash-grey sky, dead trees silhouettes, no text, painterly D&D aesthetic, horizontal banner",
    sign: "Fantasy charred basalt sign slab with ember cracks glowing orange at edges, empty center, no letters, illustration",
  },
  astral: {
    banner:
      "Wide cinematic fantasy astral plane vista, silver void, floating rock isles, nebula purple and pink clouds, distant stars, no text, painterly D&D aesthetic, horizontal banner",
    sign: "Fantasy floating silver rune frame sign, nebula shimmer border, empty dark violet center panel, starlight, no letters, illustration",
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
