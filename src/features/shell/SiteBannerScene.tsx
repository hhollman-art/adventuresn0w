"use client";

import type { ComponentType } from "react";
import type { AppThemeId } from "@/lib/themes/types";
import ThemeBannerArt from "@/features/shell/ThemeBannerArt";
import BannerAstral from "@/features/shell/banners/BannerAstral";
import BannerDragonDen from "@/features/shell/banners/BannerDragonDen";
import BannerForest from "@/features/shell/banners/BannerForest";
import BannerHades from "@/features/shell/banners/BannerHades";
import BannerIceTower from "@/features/shell/banners/BannerIceTower";
import BannerPaladinCitadel from "@/features/shell/banners/BannerPaladinCitadel";
import BannerPirates from "@/features/shell/banners/BannerPirates";
import BannerThievesGuild from "@/features/shell/banners/BannerThievesGuild";

const BANNERS: Record<AppThemeId, ComponentType> = {
  forest: BannerForest,
  "dragon-den": BannerDragonDen,
  "thieves-guild": BannerThievesGuild,
  "paladin-citadel": BannerPaladinCitadel,
  "ice-tower": BannerIceTower,
  pirates: BannerPirates,
  hades: BannerHades,
  astral: BannerAstral,
};

type SiteBannerSceneProps = {
  themeId: AppThemeId;
};

export default function SiteBannerScene({ themeId }: SiteBannerSceneProps) {
  const SvgFallback = BANNERS[themeId] ?? BannerForest;
  return <ThemeBannerArt themeId={themeId} SvgFallback={SvgFallback} />;
}
