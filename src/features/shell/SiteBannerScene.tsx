"use client";

import type { AppThemeId } from "@/lib/themes/types";
import ThemeBannerArt from "@/features/shell/ThemeBannerArt";
import BannerThemed from "@/features/shell/banners/BannerThemed";

type SiteBannerSceneProps = {
  themeId: AppThemeId;
};

export default function SiteBannerScene({ themeId }: SiteBannerSceneProps) {
  return (
    <ThemeBannerArt
      themeId={themeId}
      SvgFallback={() => <BannerThemed themeId={themeId} />}
    />
  );
}
