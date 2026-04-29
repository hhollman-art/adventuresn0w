import { z } from "zod";
import { NextResponse } from "next/server";

export const adventurePostSchema = z.object({
  adventureLength: z.string().optional(),
  combatIntensity: z.union([z.number(), z.string()]).optional(),
  titleHint: z.string().optional(),
  levelRange: z.string().optional(),
  tone: z.string().optional(),
  setting: z.string().optional(),
  villainOrThreat: z.string().optional(),
  partySize: z.string().optional(),
  sessionLength: z.string().optional(),
  extraNotes: z.string().optional(),
  realmSeedMarkdown: z.string().optional(),
  stream: z.boolean().optional(),
});

export const realmPostSchema = z.object({
  realmSize: z.string().optional(),
  titleHint: z.string().optional(),
  description: z.string().optional(),
  extraNotes: z.string().optional(),
  realmSeedMarkdown: z.string().optional(),
  stream: z.boolean().optional(),
});

export const charactersPostSchema = z.object({
  partyConcept: z.string().optional(),
  levelRange: z.string().optional(),
  tone: z.string().optional(),
  setting: z.string().optional(),
  characterCount: z.string().optional(),
  extraNotes: z.string().optional(),
});

export const mapImagePostSchema = z.object({
  mapKind: z.string().optional(),
  locationName: z.string().optional(),
  levelRange: z.string().optional(),
  partySize: z.string().optional(),
  tone: z.string().optional(),
  context: z.string().optional(),
  gridNotes: z.string().optional(),
  extraNotes: z.string().optional(),
  libraryReferenceMarkdown: z.string().optional(),
  imageSize: z.string().optional(),
  imageQuality: z.string().optional(),
});

export const propImagePostSchema = z.object({
  itemCategory: z.string().optional(),
  propType: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  bodyText: z.string().optional(),
  style: z.string().optional(),
  ageWear: z.string().optional(),
  settingHint: z.string().optional(),
  extraNotes: z.string().optional(),
  imageSize: z.string().optional(),
  imageQuality: z.string().optional(),
});

export const realmImagePostSchema = z.object({
  realmSize: z.string().optional(),
  titleHint: z.string().optional(),
  realmMarkdown: z.string().optional(),
  imageSize: z.string().optional(),
  imageQuality: z.string().optional(),
});

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
