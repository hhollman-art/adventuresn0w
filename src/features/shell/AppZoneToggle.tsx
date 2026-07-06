"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FANTASY_FORGE, VIRTUAL_TABLE } from "@/lib/workplace/forgeLexicon";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";

export { WORKSHOP_WELCOME_EVENT } from "@/lib/workshop/goWelcome";

type AppZoneToggleProps = {
  /** Compact layout for the site banner corner. */
  compact?: boolean;
};

/** Fantasy Forge ↔ Virtual Table zone switch. */
export default function AppZoneToggle({ compact = false }: AppZoneToggleProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const onTable = pathname.startsWith("/table");

  const goFantasyForgeWelcome = () => {
    router.push("/");
    dispatchWorkshopWelcome();
  };

  return (
    <div
      className={`forge-zone-switch no-print${compact ? " forge-zone-switch--compact" : ""}`}
      aria-live="polite"
    >
      {!compact ? (
        <p className="forge-zone-switch-label">Where are you working?</p>
      ) : (
        <span className="sr-only">Switch between Fantasy Forge and Virtual Table</span>
      )}
      <nav
        className="zone-nav forge-zone-switch-nav"
        aria-label="Fantasy Forge or Virtual Table"
      >
        <button
          type="button"
          onClick={goFantasyForgeWelcome}
          className={`zone-nav-link forge-zone-link${!onTable ? " zone-nav-link--active" : ""}`}
          aria-current={!onTable ? "page" : undefined}
          title={`Return to the ${FANTASY_FORGE} welcome hearth`}
        >
          <span className="zone-nav-icon" aria-hidden="true">
            {"\u2692\uFE0F"}
          </span>
          <span className="forge-zone-link-text">
            {compact ? "Forge" : FANTASY_FORGE}
          </span>
        </button>
        <Link
          href="/table"
          className={`zone-nav-link forge-zone-link${onTable ? " zone-nav-link--active" : ""}`}
          aria-current={onTable ? "page" : undefined}
          title={`Open the ${VIRTUAL_TABLE} (DM view)`}
        >
          <span className="zone-nav-icon" aria-hidden="true">
            {"\u{1F3B2}"}
          </span>
          <span className="forge-zone-link-text">{compact ? "VTT" : VIRTUAL_TABLE}</span>
        </Link>
      </nav>
    </div>
  );
}
