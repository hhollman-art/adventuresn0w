import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { normalizeEmail } from "./validation";

export type StoredAccount = {
  id: string;
  email: string;
  passwordHash: string;
  tier: "free" | "premium" | "admin";
  createdAt: string;
};

/** In-memory account registry — swap for a database in production. */
const accountsByEmail = new Map<string, StoredAccount>();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(candidate);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function findAccountByEmail(email: string): StoredAccount | null {
  return accountsByEmail.get(normalizeEmail(email)) ?? null;
}

export function registerAccount(email: string, password: string): StoredAccount {
  const normalized = normalizeEmail(email);
  if (accountsByEmail.has(normalized)) {
    throw new Error("EMAIL_TAKEN");
  }
  const account: StoredAccount = {
    id: `user-${randomBytes(8).toString("hex")}`,
    email: normalized,
    passwordHash: hashPassword(password),
    tier: "free",
    createdAt: new Date().toISOString(),
  };
  accountsByEmail.set(normalized, account);
  return account;
}

export function verifyAccountPassword(email: string, password: string): StoredAccount | null {
  const account = findAccountByEmail(email);
  if (!account) return null;
  return verifyPassword(password, account.passwordHash) ? account : null;
}

/** Test-only reset */
export function __resetAccountStoreForTests(): void {
  accountsByEmail.clear();
}

export { verifyPassword, hashPassword };
