"use client";

import Link from "next/link";
import type { BreadcrumbSegment } from "@/lib/workshop/workshopBreadcrumbs";

type WorkshopBreadcrumbsProps = {
  segments: BreadcrumbSegment[];
};

export default function WorkshopBreadcrumbs({ segments }: WorkshopBreadcrumbsProps) {
  if (segments.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="workshop-breadcrumbs shrink-0">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {segments.map((segment, index) => {
          const last = index === segments.length - 1;
          return (
            <li key={`${segment.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <span className="text-[var(--muted)]" aria-hidden="true">
                  /
                </span>
              ) : null}
              {segment.href && !last ? (
                <Link
                  href={segment.href}
                  className="font-semibold text-[var(--accent-dim)] hover:underline"
                >
                  {segment.label}
                </Link>
              ) : (
                <span
                  className={last ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]"}
                  aria-current={last ? "page" : undefined}
                >
                  {segment.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
