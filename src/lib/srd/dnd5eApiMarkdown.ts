import {
  DND5E_API_ORIGIN,
  DND5E_API_VERSION,
  type SrdApiResource,
} from "@/lib/srd/dnd5eApi";
import { SRD_ATTRIBUTION_SHORT } from "@/lib/srd/manifest";

type NamedRef = { name?: string; index?: string };
type DescBlock = { name?: string; desc?: string | string[] };

function lines(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join("\n");
}

function joinDesc(desc: unknown): string {
  if (Array.isArray(desc)) return desc.filter(Boolean).join("\n\n");
  if (typeof desc === "string") return desc;
  return "";
}

/** API rule text often repeats the entry title as a leading #/## heading. */
function stripLeadingDuplicateHeading(name: string, desc: string): string {
  const trimmed = desc.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return trimmed;

  const normalizedName = name.trim().toLowerCase();
  const lines = trimmed.split("\n");
  let index = 0;
  while (index < lines.length && !lines[index]?.trim()) index += 1;
  if (index >= lines.length) return trimmed;

  const match = lines[index]?.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return trimmed;

  const headingText = match[2].replace(/\*\*(.+?)\*\*/g, "$1").trim().toLowerCase();
  if (headingText !== normalizedName) return trimmed;

  index += 1;
  while (index < lines.length && !lines[index]?.trim()) index += 1;
  return lines.slice(index).join("\n");
}

function bodyDesc(name: string, desc: unknown): string {
  return stripLeadingDuplicateHeading(name, joinDesc(desc));
}

function namedList(items: unknown, label = "name"): string {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => {
      if (typeof item === "string") return `- ${item}`;
      if (item && typeof item === "object" && label in item) {
        return `- ${String((item as Record<string, unknown>)[label])}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatAbilityScores(data: Record<string, unknown>): string {
  const stats = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
    .map((key) => {
      const value = data[key];
      if (typeof value !== "number") return null;
      const mod = Math.floor((value - 10) / 2);
      const modStr = mod >= 0 ? `+${mod}` : String(mod);
      const abbr = key.slice(0, 3).toUpperCase();
      return `| ${abbr} | ${value} (${modStr}) |`;
    })
    .filter(Boolean);

  if (stats.length === 0) return "";
  return lines("| Stat | Score |", "| --- | --- |", ...stats);
}

function formatMonster(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Monster");
  const size = data.size ? String(data.size) : "";
  const type = data.type ? String(data.type) : "";
  const subtype = data.subtype ? ` (${data.subtype})` : "";
  const alignment = data.alignment ? `, ${data.alignment}` : "";
  const header = `*${[size, type + subtype].filter(Boolean).join(" ")}${alignment}*`;

  const acParts = Array.isArray(data.armor_class)
    ? (data.armor_class as Array<{ value?: number; type?: string }>).map(
        (entry) => `${entry.value ?? "?"}${entry.type ? ` (${entry.type})` : ""}`,
      )
    : [];
  const hp = data.hit_points != null ? String(data.hit_points) : "?";
  const hd = data.hit_dice ? ` (${data.hit_dice})` : "";
  const speed =
    data.speed && typeof data.speed === "object"
      ? Object.entries(data.speed as Record<string, string>)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ")
      : "";

  const cr = data.challenge_rating != null ? String(data.challenge_rating) : "?";
  const xp = data.xp != null ? ` (${data.xp} XP)` : "";

  const traits = (key: string, heading: string) => {
    const blocks = data[key];
    if (!Array.isArray(blocks) || blocks.length === 0) return "";
    return lines(
      `## ${heading}`,
      ...(blocks as DescBlock[]).flatMap((block) => [
        block.name ? `### ${block.name}` : "",
        joinDesc(block.desc),
      ]),
    );
  };

  return lines(
    `# ${name}`,
    header,
    "",
    `**Armor Class** ${acParts.join(", ") || "—"}`,
    `**Hit Points** ${hp}${hd}`,
    speed ? `**Speed** ${speed}` : "",
    "",
    formatAbilityScores(data),
    "",
    data.senses && typeof data.senses === "object"
      ? `**Senses** ${Object.entries(data.senses as Record<string, unknown>)
          .map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`)
          .join(", ")}`
      : "",
    data.languages ? `**Languages** ${data.languages}` : "",
    `**Challenge** ${cr}${xp}`,
    traits("special_abilities", "Traits"),
    traits("actions", "Actions"),
    traits("reactions", "Reactions"),
    traits("legendary_actions", "Legendary Actions"),
    attributionFooter(String(data.url ?? "")),
  );
}

function formatSpell(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Spell");
  const level = data.level;
  const levelLabel =
    level === 0 ? "Cantrip" : typeof level === "number" ? `${level}${ordinal(level)}-level` : "";
  const school =
    data.school && typeof data.school === "object"
      ? String((data.school as NamedRef).name ?? "")
      : "";
  const subtitle = [levelLabel, school].filter(Boolean).join(" ");

  const meta = [
    data.casting_time ? `**Casting Time:** ${data.casting_time}` : "",
    data.range ? `**Range:** ${data.range}` : "",
    Array.isArray(data.components)
      ? `**Components:** ${(data.components as string[]).join(", ")}`
      : "",
    data.duration ? `**Duration:** ${data.duration}` : "",
    data.concentration ? "**Concentration**" : "",
    data.ritual ? "**Ritual**" : "",
  ].filter(Boolean);

  const classes =
    Array.isArray(data.classes) && data.classes.length
      ? `**Classes:** ${(data.classes as NamedRef[]).map((c) => c.name).filter(Boolean).join(", ")}`
      : "";

  return lines(
    `# ${name}`,
    subtitle ? `*${subtitle}*` : "",
    "",
    ...meta,
    classes,
    "",
    joinDesc(data.desc),
    joinDesc(data.higher_level) ? `\n**At Higher Levels.** ${joinDesc(data.higher_level)}` : "",
    data.material ? `\n**Material:** ${data.material}` : "",
    attributionFooter(String(data.url ?? "")),
  );
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  const mod10 = n % 10;
  if (mod10 === 1) return "st";
  if (mod10 === 2) return "nd";
  if (mod10 === 3) return "rd";
  return "th";
}

function formatClass(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Class");
  const hitDie = data.hit_die ? `d${data.hit_die}` : "?";

  const saves = Array.isArray(data.saving_throws)
    ? (data.saving_throws as NamedRef[]).map((s) => s.name).filter(Boolean).join(", ")
    : "";
  const profs = Array.isArray(data.proficiencies)
    ? (data.proficiencies as NamedRef[]).map((p) => p.name).filter(Boolean).join(", ")
    : "";
  const subclasses = Array.isArray(data.subclasses)
    ? (data.subclasses as NamedRef[]).map((s) => s.name).filter(Boolean).join(", ")
    : "";

  return lines(
    `# ${name}`,
    "",
    `**Hit Die:** ${hitDie}`,
    saves ? `**Saving Throws:** ${saves}` : "",
    profs ? `**Proficiencies:** ${profs}` : "",
    subclasses ? `**Subclasses (SRD):** ${subclasses}` : "",
    data.class_levels ? `\nLevel progression: \`${data.class_levels}\`` : "",
    attributionFooter(String(data.url ?? "")),
  );
}

function formatRace(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Race");
  const speed = data.speed != null ? `**Speed:** ${data.speed} ft.` : "";
  const size = data.size ? `**Size:** ${data.size}` : "";
  const langs = Array.isArray(data.languages)
    ? `**Languages:** ${(data.languages as NamedRef[]).map((l) => l.name).filter(Boolean).join(", ")}`
    : typeof data.language_desc === "string"
      ? `**Languages:** ${data.language_desc}`
      : "";
  const traits = Array.isArray(data.traits)
    ? lines(
        "## Traits",
        ...(data.traits as NamedRef[]).map((t) => `- ${t.name ?? t.index ?? "Trait"}`),
        "",
        "_Open each trait in the Traits category for full text._",
      )
    : "";

  return lines(
    `# ${name}`,
    "",
    size,
    speed,
    langs,
    joinDesc(data.ability_bonus_options) ? `\n${joinDesc(data.ability_bonus_options)}` : "",
    joinDesc(data.alignment) ? `\n**Alignment:** ${joinDesc(data.alignment)}` : "",
    joinDesc(data.age) ? `\n**Age:** ${joinDesc(data.age)}` : "",
    traits,
    attributionFooter(String(data.url ?? "")),
  );
}

function formatMagicItem(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Magic Item");
  const rarity =
    data.rarity && typeof data.rarity === "object"
      ? String((data.rarity as NamedRef).name ?? "")
      : typeof data.rarity === "string"
        ? data.rarity
        : "";
  const category =
    data.equipment_category && typeof data.equipment_category === "object"
      ? String((data.equipment_category as NamedRef).name ?? "")
      : "";
  const subtitle = [rarity, category].filter(Boolean).join(" · ");

  return lines(
    `# ${name}`,
    subtitle ? `*${subtitle}*` : "",
    "",
    data.requires_attunement ? "**Requires attunement**" : "",
    joinDesc(data.desc),
    joinDesc(data.special) ? `\n${joinDesc(data.special)}` : "",
    attributionFooter(String(data.url ?? "")),
  );
}

function formatEquipment(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Equipment");
  const category =
    data.equipment_category && typeof data.equipment_category === "object"
      ? String((data.equipment_category as NamedRef).name ?? "")
      : "";
  const cost =
    data.cost && typeof data.cost === "object"
      ? `${(data.cost as { quantity?: number; unit?: string }).quantity ?? ""} ${(data.cost as { unit?: string }).unit ?? ""}`.trim()
      : "";
  const weight = data.weight != null ? `${data.weight} lb.` : "";
  const damage =
    data.damage && typeof data.damage === "object"
      ? `${(data.damage as { damage_dice?: string }).damage_dice ?? ""} ${((data.damage as { damage_type?: NamedRef }).damage_type?.name ?? "")}`.trim()
      : "";
  const props = Array.isArray(data.properties)
    ? (data.properties as NamedRef[]).map((p) => p.name).filter(Boolean).join(", ")
    : "";

  return lines(
    `# ${name}`,
    category ? `*${category}*` : "",
    "",
    cost ? `**Cost:** ${cost}` : "",
    weight ? `**Weight:** ${weight}` : "",
    damage ? `**Damage:** ${damage}` : "",
    props ? `**Properties:** ${props}` : "",
    joinDesc(data.desc),
    joinDesc(data.special) ? `\n${joinDesc(data.special)}` : "",
    attributionFooter(String(data.url ?? "")),
  );
}

function formatRulesIndex(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Rules");
  const intro = bodyDesc(name, data.desc);
  const subsections = Array.isArray(data.subsections)
    ? lines(
        "## Sections",
        ...(data.subsections as NamedRef[]).map((s) => `- ${s.name ?? s.index}`),
      )
    : "";

  return lines(`# ${name}`, intro, subsections, attributionFooter(String(data.url ?? "")));
}

function formatGeneric(data: Record<string, unknown>): string {
  const name = String(data.name ?? "Entry");
  const desc = bodyDesc(name, data.desc);
  const extras: string[] = [];

  if (Array.isArray(data.features) && data.features.length) {
    extras.push(
      lines(
        "## Features",
        ...(data.features as DescBlock[]).flatMap((f) => [
          f.name ? `### ${f.name}` : "",
          joinDesc(f.desc),
        ]),
      ),
    );
  }

  if (Array.isArray(data.feature_choice_options)) {
    extras.push(namedList(data.feature_choice_options));
  }

  return lines(`# ${name}`, desc, ...extras, attributionFooter(String(data.url ?? "")));
}

function attributionFooter(apiUrl: string): string {
  const source = apiUrl
    ? `[D&D 5e API](${DND5E_API_ORIGIN}${apiUrl}) (${DND5E_API_VERSION} SRD)`
    : `[D&D 5e API](${DND5E_API_ORIGIN}) (${DND5E_API_VERSION} SRD)`;
  return `\n---\n\n${SRD_ATTRIBUTION_SHORT} Reference via ${source}.`;
}

/** Convert a fetched API resource into Markdown for the Library preview carousel. */
export function dnd5eResourceToMarkdown(
  resource: SrdApiResource,
  data: Record<string, unknown>,
): string {
  switch (resource) {
    case "monsters":
      return formatMonster(data);
    case "spells":
      return formatSpell(data);
    case "classes":
      return formatClass(data);
    case "races":
      return formatRace(data);
    case "equipment":
      return formatEquipment(data);
    case "magic-items":
      return formatMagicItem(data);
    case "rules":
      return formatRulesIndex(data);
    case "rule-sections":
    case "conditions":
    case "feats":
    case "backgrounds":
    case "subclasses":
      return formatGeneric(data);
    default:
      return formatGeneric(data);
  }
}

export const SRD_LIBRARY_INTRO_MARKDOWN = `# SRD reference

Browse **spells**, **monsters**, **classes**, **equipment**, **magic items**, and **rules** from the bundled **SRD_CC_v5.2.1** document (${DND5E_API_VERSION} API used for browse lists where needed).

Pick a category and entry in **Browse repository** — full **SRD 5.2.1** text opens in the Scrying Glass when available. This material is read-only, ships under **CC BY 4.0**, and never needs backing up.

Character pickers elsewhere in the app use the bundled SRD spell/class index.

${SRD_ATTRIBUTION_SHORT}`;
