import { z } from "zod";

/** Suggested item-type lines for the Create Artifact form. */
export const ARTIFACT_ITEM_TYPE_OPTIONS = [
  "Weapon",
  "Armor",
  "Wondrous Item",
  "Ring",
  "Potion",
  "Scroll",
  "Wand",
  "Staff",
  "Rod",
  "Ammunition",
  "Tool",
  "Adventuring Gear",
  "Artifact",
] as const;

/** Suggested setting / system classification chips. */
export const ARTIFACT_SETTING_TAG_OPTIONS = [
  "Homebrew",
  "Realm",
  "Campaign",
  "House Rules",
] as const;

const RARITY_VALUES = [
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
] as const;

const raritySchema = z.enum(RARITY_VALUES);

/**
 * Form + save validation for custom Library artifacts (magic / homebrew items).
 * Client-side only — persistence is the local item library, not a server DB.
 */
export const createCustomArtifactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give this artifact a name.")
    .max(120, "Keep the name under 120 characters."),
  itemType: z
    .string()
    .trim()
    .min(1, "Pick or type an item type (Weapon, Ring, Wondrous Item…).")
    .max(80, "Keep the type under 80 characters."),
  rarity: raritySchema,
  requiresAttunement: z.boolean(),
  attunementNote: z.string().max(240).optional().default(""),
  description: z.string().max(12_000).optional().default(""),
  properties: z.string().max(4_000).optional().default(""),
  charges: z.string().max(1_000).optional().default(""),
  effects: z.string().max(8_000).optional().default(""),
  sourceNote: z.string().max(160).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(24).optional().default([]),
  settingTags: z
    .array(z.string().trim().min(1).max(40))
    .max(12)
    .optional()
    .default([]),
  imageDataUrl: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => v == null || v.startsWith("data:image/"),
      "Artwork must be an image saved on this device.",
    ),
  createdBy: z.string().trim().max(120).nullable().optional().default(null),
});

export type CreateCustomArtifactInput = z.infer<typeof createCustomArtifactSchema>;

export function parseCreateCustomArtifact(
  raw: unknown,
):
  | { ok: true; data: CreateCustomArtifactInput }
  | { ok: false; error: string } {
  const parsed = createCustomArtifactSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Check the form — something needs fixing.",
    };
  }
  return { ok: true, data: parsed.data };
}
