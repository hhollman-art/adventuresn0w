export type { DmAccount, DmAuthSession, DmLoginRequest, DmLoginResponse, DmRegisterRequest, AuthSessionResponse, UserTier, UserRole } from "./types";
export { createDmSessionToken, verifyDmSessionToken, DM_SESSION_COOKIE, setSessionCookie, clearSessionCookie } from "./dmSession";
export { authenticateCredentials, validateDmCredentials, isDmHostingEnabled, emailAlreadyRegistered, storedAccountToDmAccount } from "./credentials";
export { requireDmSession } from "./requireDmSession";
export { getAuthSecret, isAuthEnabled, isRegistrationOpen, hasEnvAdminCredentials } from "./authSecret";
export { normalizeEmail, validateEmail, validatePassword, validateAuthFields, type FieldErrors } from "./validation";
export { getPostLoginRedirect, canAccessPremiumFeature, isAdmin, createFreeAccount, tierToLicenseTier } from "./tiers";
export { registerAccount, findAccountByEmail } from "./accountStore";
