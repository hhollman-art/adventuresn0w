/**
 * First-Save routing controller.
 *
 * Intercepts the DM's very first custom Creation File save. Until Arcane Vault
 * storage prefs are configured, callers must await `gateFirstCustomCfSave()`
 * which opens the preference modal (via event) and resolves only after the
 * DM confirms a default path.
 */

import {
  isVaultStorageConfigured,
  loadVaultStoragePrefs,
  type VaultStoragePrefs,
} from "@/lib/workshop/vaultStoragePrefs";

export const FIRST_SAVE_GATE_EVENT = "ddeasy-first-save-gate";
export const FIRST_SAVE_GATE_RESOLVED = "ddeasy-first-save-gate-resolved";

export type FirstSaveGateDetail = {
  requestId: string;
  /** Human label for what is about to be saved (e.g. item name). */
  label: string;
};

export type FirstSaveGateResolvedDetail = {
  requestId: string;
  /** false if the DM cancelled the vault setup. */
  ok: boolean;
  prefs: VaultStoragePrefs | null;
};

let pending: {
  requestId: string;
  resolve: (ok: boolean) => void;
} | null = null;

function newRequestId(): string {
  return `fs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * If vault prefs are already configured, returns immediately.
 * Otherwise dispatches the gate event and waits for the modal to resolve.
 * Returns false if the user cancels (caller should abort the save).
 */
export function gateFirstCustomCfSave(label: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  if (isVaultStorageConfigured()) return Promise.resolve(true);

  // Collapse concurrent first-saves into one modal.
  if (pending) {
    return new Promise((resolve) => {
      const prev = pending!;
      pending = {
        requestId: prev.requestId,
        resolve: (ok) => {
          prev.resolve(ok);
          resolve(ok);
        },
      };
    });
  }

  const requestId = newRequestId();
  return new Promise((resolve) => {
    pending = { requestId, resolve };
    window.dispatchEvent(
      new CustomEvent<FirstSaveGateDetail>(FIRST_SAVE_GATE_EVENT, {
        detail: { requestId, label },
      }),
    );
  });
}

/** Called by the First-Save modal when the DM confirms or cancels. */
export function resolveFirstSaveGate(detail: FirstSaveGateResolvedDetail): void {
  if (!pending) return;
  if (detail.requestId !== pending.requestId) return;
  const { resolve } = pending;
  pending = null;
  resolve(detail.ok);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<FirstSaveGateResolvedDetail>(FIRST_SAVE_GATE_RESOLVED, {
        detail,
      }),
    );
  }
}

/** Test helper — clear in-flight gate. */
export function resetFirstSaveGateForTests(): void {
  if (pending) {
    pending.resolve(false);
    pending = null;
  }
}

export function peekVaultPrefs(): VaultStoragePrefs {
  return loadVaultStoragePrefs();
}
