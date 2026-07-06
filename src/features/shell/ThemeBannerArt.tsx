"use client";

import { useState } from "react";
import type { AppThemeId } from "@/lib/themes/types";
import { themeArtPublicPath } from "@/lib/themes/themeArtPrompts";
import type { ComponentType } from "react";

type ThemeBannerArtProps = {
  themeId: AppThemeId;
  SvgFallback: ComponentType;
};

/** AI banner art when present in public/themes; SVG fallback keeps usability without API keys. */
export default function ThemeBannerArt({ themeId, SvgFallback }: ThemeBannerArtProps) {
  const [aiFailed, setAiFailed] = useState(false);
  const src = themeArtPublicPath(themeId, "banner");

  return (
    <div className="site-title-bar-scene-stack">
      <SvgFallback />
      {!aiFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="site-title-bar-scene-ai"
          onError={() => setAiFailed(true)}
        />
      ) : null}
    </div>
  );
}
