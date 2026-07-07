"use client";

import { useAdminAnnouncement } from "@/contexts/AdminAnnouncementContext";

type AdminAnnouncementBannerProps = {
  className?: string;
};

/**
 * Live site-wide announcement banner for Home and Dashboard views.
 * Renders only when admin config is active, has message text, and the user
 * has not dismissed it for the current session.
 */
export default function AdminAnnouncementBanner({ className = "" }: AdminAnnouncementBannerProps) {
  const { config, visible, dismiss } = useAdminAnnouncement();

  if (!visible) return null;

  return (
    <div
      className={`admin-announcement-banner admin-announcement-banner--${config.variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <p className="admin-announcement-banner-text">{config.message}</p>
      <button
        type="button"
        className="admin-announcement-banner-dismiss"
        onClick={dismiss}
        aria-label="Dismiss announcement for this session"
      >
        ×
      </button>
    </div>
  );
}
