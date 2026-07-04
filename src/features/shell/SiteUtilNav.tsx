"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const UTIL_LINKS = [
  { href: "/help", label: "How to use", icon: "\u{1F4D6}" },
  { href: "/parties", label: "Parties", icon: "\u{1F465}" },
] as const;

export default function SiteUtilNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="site-banner-util flex flex-wrap items-center gap-2" aria-label="Utilities">
      {UTIL_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`site-help-link${active ? " site-help-link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="site-help-link-icon" aria-hidden="true">
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
