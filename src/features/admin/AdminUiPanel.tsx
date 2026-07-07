"use client";

import { useState } from "react";
import { ANNOUNCEMENT_BANNER_VARIANTS } from "@/lib/admin/announcementConfig";
import { useAdminAnnouncement } from "@/contexts/AdminAnnouncementContext";

/**
 * Admin control panel for the site-wide announcement banner.
 *
 * Data flow: edits `draft` in {@link AdminAnnouncementProvider} → `saveChanges()`
 * persists via `saveAnnouncementConfigRemote` → live {@link AdminAnnouncementBanner}
 * reads `config` from the same provider.
 */
export default function AdminUiPanel() {
  const { draft, setDraft, saveChanges, saving, saveError } = useAdminAnnouncement();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const ok = await saveChanges();
    if (ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <section className="admin-ui-panel fantasy-panel" aria-labelledby="admin-ui-panel-heading">
      <header className="admin-ui-panel-header">
        <p className="zone-badge w-fit">Admin</p>
        <h2 id="admin-ui-panel-heading" className="font-display text-xl font-bold text-[var(--text)]">
          UI management
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          Configure the site-wide announcement banner shown on the Hearth and Dashboard.
        </p>
      </header>

      <div className="admin-ui-panel-body mt-5 flex flex-col gap-5">
        <label className="admin-ui-toggle flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold text-[var(--text)]">Banner active</span>
            <span className="block text-xs text-[var(--muted)]">
              When off, the banner is hidden for all users.
            </span>
          </span>
          <input
            type="checkbox"
            className="admin-ui-toggle-input"
            checked={draft.active}
            onChange={(e) => setDraft({ active: e.target.checked })}
            aria-label="Banner active"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--text)]">Banner message</span>
          <textarea
            value={draft.message}
            onChange={(e) => setDraft({ message: e.target.value })}
            rows={3}
            maxLength={280}
            placeholder="e.g. Scheduled maintenance tonight at 10 PM ET — Fantasy Forge may be briefly unavailable."
            className="admin-ui-textarea"
          />
          <span className="text-xs text-[var(--muted)]">{draft.message.length}/280 characters</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--text)]">Style variant</span>
          <select
            value={draft.variant}
            onChange={(e) =>
              setDraft({
                variant: e.target.value as typeof draft.variant,
              })
            }
            className="admin-ui-select"
          >
            {Object.entries(ANNOUNCEMENT_BANNER_VARIANTS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--muted)]">
            {ANNOUNCEMENT_BANNER_VARIANTS[draft.variant].description}
          </span>
        </label>

        <div
          className={`admin-announcement-banner admin-announcement-banner--${draft.variant} admin-announcement-banner--preview`}
          role="status"
          aria-label="Banner preview"
        >
          <p className="admin-announcement-banner-text">
            {draft.message.trim() || "Preview: your announcement will appear here."}
          </p>
          <span className="admin-announcement-banner-dismiss-preview" aria-hidden="true">
            ×
          </span>
        </div>

        {saveError ? (
          <p className="admin-ui-error" role="alert">
            {saveError}
          </p>
        ) : null}
        {saved ? (
          <p className="admin-ui-success" role="status">
            Changes saved — banner updated for all users on this device.
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn-accent w-full sm:w-auto"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}
