"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Zone = {
  id: string;
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
};

const ZONES: Zone[] = [
  {
    id: "workshop",
    href: "/",
    label: "Workshop",
    icon: "\u2692\uFE0F",
    match: (path) => path === "/" || path === "/help" || path === "/legal",
  },
  {
    id: "table",
    href: "/table",
    label: "Virtual Table",
    icon: "\u{1F3B2}",
    match: (path) => path.startsWith("/table"),
  },
];

function activeZone(pathname: string): string {
  return ZONES.find((z) => z.match(pathname))?.id ?? "workshop";
}

export default function AppZoneNav() {
  const pathname = usePathname() ?? "/";
  const current = activeZone(pathname);

  return (
    <nav className="zone-nav" aria-label="Application areas">
      {ZONES.map((zone) => {
        const active = current === zone.id;
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
            <span className="hidden min-[480px]:inline">{zone.label}</span>
            <span className="min-[480px]:hidden">
              {zone.id === "table" ? "Table" : zone.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
