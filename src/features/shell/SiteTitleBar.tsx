"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppZoneToggle from "@/features/shell/AppZoneToggle";
import SiteBannerScene from "@/features/shell/SiteBannerScene";
import ThemePicker from "@/features/shell/ThemePicker";
import ThemeSignArt from "@/features/shell/ThemeSignArt";
import HearthAuthNav from "@/features/auth/HearthAuthNav";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { useAppTheme } from "@/lib/themes/useAppTheme";
import {
  FORGE_BANNER_MODE_EVENT,
  getForgeBannerMode,
  setForgeBannerMode,
  type ForgeBannerMode,
} from "@/lib/workshop/bannerMode";
import { FANTASY_FORGE } from "@/lib/workplace/forgeLexicon";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";

function useForgeBannerMode(pathname: string): ForgeBannerMode {
  const [mode, setMode] = useState<ForgeBannerMode>(() =>
    pathname === "/" ? "welcome" : "compact",
  );

  useEffect(() => {
    if (pathname !== "/" && !pathname.startsWith("/library")) {
      setForgeBannerMode("compact");
      setMode("compact");
      return;
    }

    setMode(getForgeBannerMode());

    const onMode = (event: Event) => {
      setMode((event as CustomEvent<ForgeBannerMode>).detail);
    };

    window.addEventListener(FORGE_BANNER_MODE_EVENT, onMode);
    return () => window.removeEventListener(FORGE_BANNER_MODE_EVENT, onMode);
  }, [pathname]);

  return mode;
}

export default function SiteTitleBar() {
  const pathname = usePathname() ?? "/";
  const { themeId, setThemeId } = useAppTheme();
  const bannerMode = useForgeBannerMode(pathname);
  const isWelcomeBanner = bannerMode === "welcome";
  const isLoginRoute = pathname === "/login";

  return (
    <header
      className={`site-title-bar no-print shrink-0${isWelcomeBanner && !isLoginRoute ? "" : " site-title-bar--compact"}`}
    >
      {isWelcomeBanner && !isLoginRoute ? (
        <div className="site-title-bar-banner">
          <SiteBannerScene themeId={themeId} />
          <div className="site-title-bar-banner-shade" aria-hidden="true" />
          <div className="site-title-bar-banner-spotlight" aria-hidden="true" />

          <div className="site-title-bar-theme-picker">
            <ThemePicker themeId={themeId} onThemeChange={setThemeId} />
          </div>

          <div className="site-title-bar-banner-actions">
            <div className="site-title-bar-auth">
              <HearthAuthNav />
            </div>
            <div className="site-title-bar-zone-toggle">
              <AppZoneToggle compact />
            </div>
          </div>

          <div className="site-title-bar-hero">
            <Link
              href="/"
              className="site-title-bar-brand group"
              onClick={() => {
                if (!pathname.startsWith("/table")) {
                  dispatchWorkshopWelcome();
                }
              }}
            >
              <ThemeSignArt themeId={themeId}>
                <span className="font-display site-title-bar-title text-2xl font-bold sm:text-3xl">
                  <span className="site-title-bar-emblem" aria-hidden="true">
                    {APP_ICONS.star}
                  </span>
                  D&amp;D EASY
                  <span className="site-title-bar-emblem" aria-hidden="true">
                    {APP_ICONS.star}
                  </span>
                </span>
              </ThemeSignArt>
              <span className="site-title-bar-tagline font-display">
                {FANTASY_FORGE} &middot; Realms &middot; Adventures &middot; Heroes
              </span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="site-title-bar-compact">
          <div className="site-title-bar-compact-theme">
            <ThemePicker themeId={themeId} onThemeChange={setThemeId} />
          </div>
          <Link
            href="/"
            className="site-title-bar-compact-brand font-display"
            onClick={() => {
              if (!pathname.startsWith("/table")) {
                dispatchWorkshopWelcome();
              }
            }}
          >
            <span className="site-title-bar-compact-emblem" aria-hidden="true">
              {APP_ICONS.star}
            </span>
            D&amp;D EASY
            <span className="site-title-bar-compact-emblem" aria-hidden="true">
              {APP_ICONS.star}
            </span>
          </Link>
          <div className="site-title-bar-compact-zones">
            <HearthAuthNav />
            <AppZoneToggle compact />
          </div>
        </div>
      )}
    </header>
  );
}
