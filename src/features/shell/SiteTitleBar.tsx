"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getActiveCampaignId,
  loadCampaigns,
  onActiveCampaignChanged,
  onCampaignsChanged,
  type SavedCampaign,
} from "@/lib/campaigns";
import { activateCampaign } from "@/lib/campaignSwitch";
import AppZoneToggle from "@/features/shell/AppZoneToggle";
import SiteBannerScene from "@/features/shell/SiteBannerScene";
import ThemePicker from "@/features/shell/ThemePicker";
import ThemeSignArt from "@/features/shell/ThemeSignArt";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { useAppTheme } from "@/lib/themes/useAppTheme";
import { FANTASY_FORGE } from "@/lib/workplace/forgeLexicon";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";

function CampaignSwitcher({ pathname }: { pathname: string }) {
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    setCampaigns(await loadCampaigns());
    setActiveId(getActiveCampaignId());
  }, []);

  useEffect(() => {
    void refresh();
    const offCampaigns = onCampaignsChanged(() => void refresh());
    const offActive = onActiveCampaignChanged(() => setActiveId(getActiveCampaignId()));
    return () => {
      offCampaigns();
      offActive();
    };
  }, [refresh]);

  if (campaigns.length === 0) return null;

  const onSwitch = async (id: string | null) => {
    setSwitching(true);
    await activateCampaign(id);
    if (pathname.startsWith("/table")) {
      window.location.reload();
      return;
    }
    setSwitching(false);
  };

  return (
    <label className="campaign-switcher" title="Switch which group's campaign is open">
      <span className="campaign-switcher-icon" aria-hidden="true">
        {APP_ICONS.campaign}
      </span>
      <select
        value={activeId ?? ""}
        disabled={switching}
        onChange={(e) => void onSwitch(e.target.value || null)}
        aria-label="Active campaign"
        className="campaign-switcher-select"
      >
        <option value="">No campaign open</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SiteTitleBar() {
  const pathname = usePathname() ?? "/";
  const { themeId, setThemeId } = useAppTheme();

  return (
    <header className="site-title-bar no-print shrink-0">
      <div className="site-title-bar-banner">
        <SiteBannerScene themeId={themeId} />
        <div className="site-title-bar-banner-shade" aria-hidden="true" />
        <div className="site-title-bar-banner-spotlight" aria-hidden="true" />

        <div className="site-title-bar-theme-picker">
          <ThemePicker themeId={themeId} onThemeChange={setThemeId} />
        </div>

        <div className="site-title-bar-zone-toggle">
          <AppZoneToggle compact />
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
              <span className="font-display site-title-bar-title text-3xl font-bold sm:text-4xl">
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
          <div className="site-title-bar-campaign mt-3 flex justify-center">
            <CampaignSwitcher pathname={pathname} />
          </div>
        </div>
      </div>
    </header>
  );
}
