/**
 * Lore Vault removal — unlink (evict) vs hard purge.
 *
 * Unlink: sever parking membership when a CF is dropped into another container.
 * Hard purge: remove from the vault parking lot AND exclude the id from the
 * vault index so it does not reappear as a Library card. Library originals stay
 * in The Library — parking never owns Library rows.
 */

import {
  isParkedInVault,
  loadVaultParkingLot,
  unparkCfFromVault,
  type VaultParkedEntry,
  VAULT_PARKING_CHANGED_EVENT,
} from "@/lib/vault/vaultParking";
import { excludeFromVault } from "@/lib/vault/vaultExclusion";
import {
  extractStaticSrdEntityId,
  sourceSrdEntityIdFromGameItem,
} from "@/lib/vault/vaultSrdPark";
import { loadSavedGameItems } from "@/lib/itemLibrary";
import { loadSavedCustomSrdEntries } from "@/lib/srd/srdCustomLibrary";

export const VAULT_TOAST_EVENT = "ddeasy-vault-toast";

export type VaultToastDetail = {
  message: string;
  tone?: "info" | "success" | "warn";
};

export type RemoveFileFromVaultResult =
  | {
      ok: true;
      hardDelete: boolean;
      removed: VaultParkedEntry | null;
      message: string;
      cleanedSelectionKeys: string[];
    }
  | { ok: false; error: string };

/** Session keys that may hold a selected / previewed CF id. */
const SELECTION_STORAGE_KEYS = [
  "ddeasy-preview-snapshot",
  "ddeasy-vault-drawer-selection",
  "ddeasy-library-selection",
] as const;

function emitToast(message: string, tone: VaultToastDetail["tone"] = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<VaultToastDetail>(VAULT_TOAST_EVENT, {
      detail: { message, tone },
    }),
  );
}

/**
 * Scan session/local storage for arrays or string fields that still reference
 * the deleted file id and scrub them (prevents orphan selection crashes).
 */
export function cleanupSessionReferencesToFile(fileId: string): string[] {
  if (typeof window === "undefined") return [];
  const cleaned: string[] = [];

  for (const key of SELECTION_STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      if (raw === fileId) {
        window.localStorage.removeItem(key);
        cleaned.push(key);
        continue;
      }
      const parsed = JSON.parse(raw) as unknown;
      const next = scrubIdFromUnknown(parsed, fileId);
      if (next.changed) {
        if (next.value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(next.value));
        cleaned.push(key);
      }
    } catch {
      /* ignore corrupt keys */
    }
  }

  // Clear in-memory drag / selection hints via custom event for listeners.
  window.dispatchEvent(
    new CustomEvent("ddeasy-vault-file-removed", { detail: { fileId } }),
  );

  return cleaned;
}

function scrubIdFromUnknown(
  value: unknown,
  fileId: string,
): { value: unknown; changed: boolean } {
  if (value === fileId) return { value: null, changed: true };
  if (Array.isArray(value)) {
    const filtered = value.filter((entry) => {
      if (entry === fileId) return false;
      if (entry && typeof entry === "object" && "id" in entry) {
        return (entry as { id: unknown }).id !== fileId;
      }
      return true;
    });
    if (filtered.length !== value.length) {
      return { value: filtered, changed: true };
    }
    let changed = false;
    const mapped = filtered.map((entry) => {
      const inner = scrubIdFromUnknown(entry, fileId);
      if (inner.changed) changed = true;
      return inner.value;
    });
    return { value: mapped, changed };
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === fileId || (k === "id" && v === fileId)) {
        changed = true;
        continue;
      }
      const inner = scrubIdFromUnknown(v, fileId);
      if (inner.changed) changed = true;
      out[k] = inner.value;
    }
    return { value: out, changed };
  }
  return { value, changed: false };
}

async function resolveSourceSrdEntityId(
  fileId: string,
  parkedRow: VaultParkedEntry | null,
): Promise<string | null> {
  if (parkedRow) {
    const fromPark = extractStaticSrdEntityId(parkedRow);
    if (fromPark) return fromPark;
  }
  const [items, custom] = await Promise.all([
    loadSavedGameItems(),
    loadSavedCustomSrdEntries(),
  ]);
  const item = items.find((row) => row.id === fileId);
  if (item) return sourceSrdEntityIdFromGameItem(item);
  const srd = custom.find((row) => row.id === fileId);
  return srd?.sourceSrdEntityId ?? null;
}

/**
 * Remove a CF from the Lore Vault.
 *
 * @param fileId — parked CF id (usually Library id)
 * @param hardDelete — true = Purge from Vault; false = Unlink / eviction only
 *
 * Hard purge clears parking membership, adds the id to the vault exclusion
 * list (so it stays out of the vault index), and scrubs session selection
 * orphans. It does **not** delete Library Creation Files.
 */
export async function removeFileFromVault(
  fileId: string,
  hardDelete: boolean,
  opts?: { title?: string; sourceSrdEntityId?: string | null },
): Promise<RemoveFileFromVaultResult> {
  if (!fileId.trim()) {
    return { ok: false, error: "Missing file id." };
  }

  const parked = await isParkedInVault(fileId);
  if (!parked && !hardDelete) {
    return {
      ok: true,
      hardDelete: false,
      removed: null,
      message: "Already outside the Lore Vault parking lot.",
      cleanedSelectionKeys: [],
    };
  }

  const before = await loadVaultParkingLot();
  const removed = before.find((row) => row.id === fileId) ?? null;

  await unparkCfFromVault(fileId);

  if (hardDelete) {
    const sourceSrdEntityId =
      opts?.sourceSrdEntityId ?? (await resolveSourceSrdEntityId(fileId, removed));
    await excludeFromVault({
      id: fileId,
      title: opts?.title ?? removed?.title,
      sourceSrdEntityId,
    });
  }

  const cleanedSelectionKeys = cleanupSessionReferencesToFile(fileId);

  // Ensure listeners refresh even if unpark was a no-op.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(VAULT_PARKING_CHANGED_EVENT));
  }

  const label = opts?.title ?? removed?.title;
  const message = hardDelete
    ? label
      ? `Purged “${label}” from the Lore Vault.`
      : "Purged from the Lore Vault."
    : removed
      ? `Moved “${removed.title}” out of the Lore Vault.`
      : "Unlinked from the Lore Vault.";

  emitToast(message, hardDelete ? "warn" : "success");

  return {
    ok: true,
    hardDelete,
    removed,
    message,
    cleanedSelectionKeys,
  };
}

/**
 * Eviction path — call after a successful drop into Campaign / Character / VTT
 * when the drag originated from vault parking (`holdKind: "park"`).
 */
export async function evictFromVaultAfterSuccessfulDrop(
  fileId: string | null | undefined,
  wasParked: boolean,
): Promise<RemoveFileFromVaultResult | null> {
  if (!fileId || !wasParked) return null;
  return removeFileFromVault(fileId, false);
}

export function showVaultToast(message: string, tone?: VaultToastDetail["tone"]): void {
  emitToast(message, tone);
}
