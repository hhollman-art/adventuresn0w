import type { DmAccount, UserTier } from "./types";

/** Map subscription tier to legacy license tier used by session-room hosting. */
export function tierToLicenseTier(tier: UserTier): DmAccount["licenseTier"] {
  switch (tier) {
    case "admin":
    case "premium":
      return "dm";
    case "free":
    default:
      return "none";
  }
}

/**
 * Resolve the post-login redirect for an authenticated account.
 *
 * @example Premium upsell (future)
 * ```ts
 * if (!canAccessPremiumFeature(account)) {
 *   return "/pricing?returnTo=/dashboard";
 * }
 * ```
 */
export function getPostLoginRedirect(account: DmAccount): string {
  if (account.role === "player") return "/join";
  switch (account.tier) {
    case "admin":
    case "premium":
    case "free":
    default:
      return "/dashboard";
  }
}

/**
 * Gate premium-only features (Fantasy Forge quotas, session hosting, etc.).
 *
 * **Future billing integration:** replace the tier check with a live subscription
 * lookup (e.g. Stripe `customer.subscription.status === "active"`) and fall back
 * to `account.tier` when offline.
 *
 * @param account - Authenticated DM account from the session payload.
 * @param feature - Optional feature key for granular gates later.
 */
export function canAccessPremiumFeature(account: DmAccount): boolean {
  return account.tier === "premium" || account.tier === "admin";
}

export function isAdmin(account: DmAccount): boolean {
  return account.tier === "admin";
}

/** Default account shape for new sign-ups during the open phase. */
export function createFreeAccount(params: {
  id: string;
  email: string;
  username?: string;
}): DmAccount {
  const username = params.username ?? params.email.split("@")[0] ?? "dm";
  return {
    id: params.id,
    email: params.email,
    username,
    role: "dm",
    tier: "free",
    licenseTier: "none",
    licenseExpiresAt: null,
  };
}
