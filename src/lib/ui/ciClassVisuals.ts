import type { CiClass } from "@/lib/ciRegistry";
import { APP_ICONS } from "@/lib/ui/appIcons";

export type CiClassVisual = {
  icon: string;
  accent: string;
};

/** Lightweight visual language for Creation File cards in the Library. */
export const CI_CLASS_VISUAL: Record<CiClass, CiClassVisual> = {
  "seed.realm": { icon: APP_ICONS.map, accent: "#6b8f4e" },
  "seed.adventure": { icon: APP_ICONS.scroll, accent: "#8b4518" },
  "seed.characters": { icon: APP_ICONS.combat, accent: "#7a2828" },
  "seed.maps": { icon: APP_ICONS.map, accent: "#4a7a9a" },
  "seed.props": { icon: APP_ICONS.chest, accent: "#9a7416" },
  "result.realm": { icon: APP_ICONS.map, accent: "#6b8f4e" },
  "result.adventure": { icon: APP_ICONS.scroll, accent: "#8b4518" },
  "result.characters": { icon: APP_ICONS.combat, accent: "#7a2828" },
  "result.maps": { icon: APP_ICONS.map, accent: "#4a7a9a" },
  "result.props": { icon: APP_ICONS.chest, accent: "#9a7416" },
  "character.sheet": { icon: APP_ICONS.combat, accent: "#7a2828" },
  "item.equipment": { icon: APP_ICONS.chest, accent: "#8a6a2a" },
  "item.magic": { icon: APP_ICONS.spellbook, accent: "#7048b8" },
  "item.srd-equipment": { icon: APP_ICONS.chest, accent: "#6a6a6a" },
  "item.srd-magic": { icon: APP_ICONS.spellbook, accent: "#7048b8" },
  "party.roster": { icon: APP_ICONS.banner, accent: "#4a68b8" },
  "campaign.record": { icon: APP_ICONS.scroll, accent: "#8b2635" },
  "campaign.lore-vault": { icon: APP_ICONS.chest, accent: "#e3b341" },
  "npc.record": { icon: APP_ICONS.combat, accent: "#6a4a8a" },
  "location.record": { icon: APP_ICONS.map, accent: "#3d6a4a" },
  "session.record": { icon: APP_ICONS.scroll, accent: "#5a4a6a" },
  "session.tabletop": { icon: APP_ICONS.combat, accent: "#5c4a2e" },
  "session.snapshot": { icon: APP_ICONS.map, accent: "#5c4a2e" },
  "session.room": { icon: APP_ICONS.combat, accent: "#3d8fd4" },
  "rules.srd-entry": { icon: APP_ICONS.spellbook, accent: "#4a68b8" },
  "rules.srd-bundle": { icon: "📚", accent: "#6b4fa8" },
  "rules.custom-entry": { icon: APP_ICONS.spellbook, accent: "#c9a227" },
  "spell.srd-entry": { icon: APP_ICONS.spellbook, accent: "#5eb8ff" },
  "monster.srd-entry": { icon: APP_ICONS.combat, accent: "#7a2828" },
};

const FALLBACK_VISUAL: CiClassVisual = {
  icon: APP_ICONS.scroll,
  accent: "#6a6a6a",
};

export function ciClassVisual(ciClass: CiClass | string): CiClassVisual {
  return CI_CLASS_VISUAL[ciClass as CiClass] ?? FALLBACK_VISUAL;
}
