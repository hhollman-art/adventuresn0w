"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const KEY_LINKS = [
  { href: "/help", label: "How to use", icon: "\u{1F4D6}", match: (p: string) => p === "/help" || p.startsWith("/help/") },
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
