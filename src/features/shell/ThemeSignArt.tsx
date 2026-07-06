"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { AppThemeId } from "@/lib/themes/types";
import { themeArtPublicPath } from "@/lib/themes/themeArtPrompts";

type ThemeSignArtProps = {
  themeId: AppThemeId;
  children: ReactNode;
};

/** Theme-specific sign backdrop — AI wood/stone/slate texture behind the app title. */
export default function ThemeSignArt({ themeId, children }: ThemeSignArtProps) {
  const [aiFailed, setAiFailed] = useState(false);
  const src = themeArtPublicPath(themeId, "sign");

  return (
    <span className="site-title-bar-sign">
      {!aiFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="site-title-bar-sign-art"
          onError={() => setAiFailed(true)}
        />
      ) : null}
      <span className="site-title-bar-sign-inner">{children}</span>
    </span>
  );
}
