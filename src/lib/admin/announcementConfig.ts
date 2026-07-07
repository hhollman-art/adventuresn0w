/** RPG-themed banner palette — all pairs meet WCAG AA (4.5:1) for body text on dark fills. */
export type AnnouncementBannerVariant = "arcane-amber" | "abyssal-crimson" | "void-purple";

export type AnnouncementConfig = {
  active: boolean;
  message: string;
  variant: AnnouncementBannerVariant;
  /** ISO timestamp of last save — useful when syncing to an API later. */
  updatedAt: string;
};

export const ANNOUNCEMENT_BANNER_VARIANTS: Record<
  AnnouncementBannerVariant,
  { label: string; description: string }
> = {
  "arcane-amber": {
    label: "Arcane Amber",
    description: "Warm gold alert — maintenance and general notices.",
  },
  "abyssal-crimson": {
    label: "Abyssal Crimson",
    description: "High-urgency crimson — outages and critical warnings.",
  },
  "void-purple": {
    label: "Void Purple",
    description: "Arcane violet — events, promos, and feature launches.",
  },
};

export const DEFAULT_ANNOUNCEMENT_CONFIG: AnnouncementConfig = {
  active: false,
  message: "",
  variant: "arcane-amber",
  updatedAt: new Date(0).toISOString(),
};

export const ANNOUNCEMENT_STORAGE_KEY = "ddeasy-admin-announcement-v1";

/** Session-only dismiss token — keyed by config updatedAt so edits re-show the banner. */
export function announcementDismissKey(updatedAt: string): string {
  return `ddeasy-announcement-dismissed-${updatedAt}`;
}
