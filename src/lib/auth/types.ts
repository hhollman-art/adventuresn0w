/** Licensed Dungeon Master account — subscription tier unlocks hosting & campaign tools. */
export type DmAccount = {
  id: string;
  username: string;
  /** Populated when billing/subscription is wired; gates session hosting. */
  licenseTier: "dm" | "trial" | "none";
  licenseExpiresAt: string | null;
};

/** Signed DM session returned after username/password login. */
export type DmAuthSession = {
  dm: DmAccount;
  issuedAt: string;
  expiresAt: string;
};

export type DmLoginRequest = {
  username: string;
  password: string;
};

export type DmLoginResponse = {
  token: string;
  session: DmAuthSession;
};
