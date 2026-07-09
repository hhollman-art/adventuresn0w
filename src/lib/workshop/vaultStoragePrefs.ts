/**
 * Arcane Vault storage preferences — permanent default save path for CFs.
 *
 * Captured on the DM's first custom Creation File save via the First-Save
 * routing controller. Survives reloads (localStorage).
 */

export const VAULT_STORAGE_PREFS_KEY = "ddeasy-vault-storage-prefs-v1";
export const VAULT_STORAGE_PREFS_CHANGED = "ddeasy-vault-storage-prefs-changed";

/** Where future CF saves should land by default. */
export type VaultStorageMode =
  /** IndexedDB + localStorage sandbox on this browser profile. */
  | "browser-sandbox"
  /** Browser sandbox PLUS auto-write to a chosen local/cloud-synced folder. */
  | "filesystem-sync";

export type VaultStoragePrefs = {
  version: 1;
  /** Explicit choice required before first custom CF save completes. */
  configured: boolean;
  mode: VaultStorageMode;
  /** Optional display path / folder name when filesystem-sync is on. */
  filesystemLabel: string | null;
  configuredAt: string | null;
};

export const DEFAULT_VAULT_STORAGE_PREFS: VaultStoragePrefs = {
  version: 1,
  configured: false,
  mode: "browser-sandbox",
  filesystemLabel: null,
  configuredAt: null,
};

export function loadVaultStoragePrefs(): VaultStoragePrefs {
  if (typeof window === "undefined") return { ...DEFAULT_VAULT_STORAGE_PREFS };
  try {
    const raw = window.localStorage.getItem(VAULT_STORAGE_PREFS_KEY);
    if (!raw) return { ...DEFAULT_VAULT_STORAGE_PREFS };
    const parsed = JSON.parse(raw) as Partial<VaultStoragePrefs>;
    return {
      version: 1,
      configured: Boolean(parsed.configured),
      mode: parsed.mode === "filesystem-sync" ? "filesystem-sync" : "browser-sandbox",
      filesystemLabel:
        typeof parsed.filesystemLabel === "string" ? parsed.filesystemLabel : null,
      configuredAt: typeof parsed.configuredAt === "string" ? parsed.configuredAt : null,
    };
  } catch {
    return { ...DEFAULT_VAULT_STORAGE_PREFS };
  }
}

export function saveVaultStoragePrefs(prefs: VaultStoragePrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VAULT_STORAGE_PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(VAULT_STORAGE_PREFS_CHANGED));
}

export function isVaultStorageConfigured(): boolean {
  return loadVaultStoragePrefs().configured;
}

export function markVaultStorageConfigured(input: {
  mode: VaultStorageMode;
  filesystemLabel?: string | null;
}): VaultStoragePrefs {
  const next: VaultStoragePrefs = {
    version: 1,
    configured: true,
    mode: input.mode,
    filesystemLabel: input.filesystemLabel ?? null,
    configuredAt: new Date().toISOString(),
  };
  saveVaultStoragePrefs(next);
  return next;
}
