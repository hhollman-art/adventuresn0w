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

const KEY_LINKS = [
  { href: "/help", label: "How to use", icon: "\u{1F4D6}", match: (p: string) => p === "/help" || p.startsWith("/help/") },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: "\u{1F3F0}",
    match: (p: string) => p === "/campaigns" || p.startsWith("/campaigns/"),
  },
  { href: "/parties", label: "Parties", icon: "\u{1F465}", match: (p: string) => p === "/parties" || p.startsWith("/parties/") },
  {
    href: "/library",
    label: "Library",
    icon: "\u{1F4DC}",
    match: (p: string) => p === "/library" || p.startsWith("/library/"),
  },
] as const;

const ZONE_LINKS = [
  {
    id: "workshop",
    href: "/",
    label: "Workshop",
    shortLabel: "Workshop",
    icon: "\u2692\uFE0F",
    match: (p: string) => p === "/" || p.startsWith("/?"),
  },
  {
    id: "table",
    href: "/table",
    label: "Virtual Table",
    shortLabel: "VTT",
    icon: "\u{1F3B2}",
    match: (p: string) => p.startsWith("/table"),
  },
] as const;

/** Active-campaign picker: switching shelves one group's table and restores the other's. */
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
    // The live VTT page holds session state in memory — reload so it can't
    // overwrite the swapped table with the previous group's session.
    if (pathname.startsWith("/table")) {
      window.location.reload();
      return;
    }
    setSwitching(false);
  };

  return (
    <label className="campaign-switcher" title="Switch which group's campaign is open">
      <span className="campaign-switcher-icon" aria-hidden="true">
        {"\u{1F3F0}"}
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

  return (
    <header className="site-title-bar no-print shrink-0">
      <div className="site-title-bar-banner">
        <Link href="/" className="site-title-bar-brand group">
          <span className="font-display site-title-bar-title block text-2xl font-bold sm:text-3xl">
            <span aria-hidden="true">&#9876;&#65039; </span>
            D&amp;D Easy
            <span aria-hidden="true"> &#9876;&#65039;</span>
          </span>
          <span className="site-title-bar-tagline">
            Forge realms &middot; Weave adventures &middot; Summon heroes
          </span>
        </Link>
      </div>

      <div className="site-title-bar-toolbar">
        <nav className="site-title-bar-actions" aria-label="Key links">
          {KEY_LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`title-bar-btn${active ? " title-bar-btn--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="title-bar-btn-icon" aria-hidden="true">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <CampaignSwitcher pathname={pathname} />

        <nav className="zone-nav site-title-bar-zones" aria-label="Workshop or Virtual Table">
          {ZONE_LINKS.map((zone) => {
            const active = zone.match(pathname);
            return (
              <Link
                key={zone.id}
                href={zone.href}
                className={`zone-nav-link${active ? " zone-nav-link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="zone-nav-icon" aria-hidden="true">
                  {zone.icon}
                </span>
                <span className="hidden min-[520px]:inline">{zone.label}</span>
                <span className="min-[520px]:hidden">{zone.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
