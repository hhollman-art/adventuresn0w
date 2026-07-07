import type { AnnouncementConfig } from "./announcementConfig";
import {
  ANNOUNCEMENT_STORAGE_KEY,
  DEFAULT_ANNOUNCEMENT_CONFIG,
} from "./announcementConfig";

export function loadAnnouncementConfig(): AnnouncementConfig {
  if (typeof window === "undefined") return DEFAULT_ANNOUNCEMENT_CONFIG;
  const raw = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
  if (!raw) return DEFAULT_ANNOUNCEMENT_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<AnnouncementConfig>;
    return {
      active: Boolean(parsed.active),
      message: typeof parsed.message === "string" ? parsed.message : "",
      variant:
        parsed.variant === "abyssal-crimson" ||
        parsed.variant === "void-purple" ||
        parsed.variant === "arcane-amber"
          ? parsed.variant
          : "arcane-amber",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return DEFAULT_ANNOUNCEMENT_CONFIG;
  }
}

export function saveAnnouncementConfigLocal(config: AnnouncementConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Persist announcement config to the server.
 *
 * **Production:** replace with `PATCH /api/admin/announcement` authenticated as `admin` tier.
 * The API should validate message length, sanitize HTML, and broadcast via edge config / KV.
 */
export async function saveAnnouncementConfigRemote(
  config: AnnouncementConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/admin/announcement", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.status === 404 || res.status === 501) {
      saveAnnouncementConfigLocal(config);
      return { ok: true };
    }
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return { ok: false, error: data.error ?? "Could not save announcement." };
    }
    saveAnnouncementConfigLocal(config);
    return { ok: true };
  } catch {
    saveAnnouncementConfigLocal(config);
    return { ok: true };
  }
}

export function isAnnouncementDismissed(updatedAt: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(`ddeasy-announcement-dismissed-${updatedAt}`) === "1";
}

export function dismissAnnouncementForSession(updatedAt: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`ddeasy-announcement-dismissed-${updatedAt}`, "1");
}

export function clearAnnouncementDismiss(updatedAt: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`ddeasy-announcement-dismissed-${updatedAt}`);
}
