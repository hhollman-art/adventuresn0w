/** Subscription tier — all new accounts default to `free` during the open phase. */
export type UserTier = "free" | "premium" | "admin";

/** Application role (orthogonal to billing tier). */
export type UserRole = "dm" | "player";

/**
 * Licensed Dungeon Master account.
 * `tier` drives feature gates; `licenseTier` is kept for backward compatibility
 * with session-room hosting checks until billing is fully wired.
 */
export type DmAccount = {
  id: string;
  email: string;
  /** Display handle — derived from email local-part when not set explicitly. */
  username: string;
  role: UserRole;
  tier: UserTier;
  /** Legacy hosting flag — maps from `tier` until Stripe/subscription replaces it. */
  licenseTier: "dm" | "trial" | "none";
  licenseExpiresAt: string | null;
};

/** Signed DM session returned after email/password login or registration. */
export type DmAuthSession = {
  dm: DmAccount;
  issuedAt: string;
  expiresAt: string;
};

export type DmLoginRequest = {
  email: string;
  password: string;
};

export type DmRegisterRequest = {
  email: string;
  password: string;
};

export type DmLoginResponse = {
  token: string;
  session: DmAuthSession;
  /** Server-resolved landing route after successful auth. */
  redirectTo: string;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  hostingEnabled: boolean;
  session?: DmAuthSession;
};
