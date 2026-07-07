export type FieldErrors = {
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize email for lookup/storage — lowercase, trimmed. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Returns a user-facing error message, or null when valid. */
export function validateEmail(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return "Email is required.";
  if (!EMAIL_RE.test(normalized)) return "Enter a valid email address.";
  return null;
}

/** Returns a user-facing error message, or null when valid. */
export function validatePassword(password: string, mode: "sign-in" | "sign-up"): string | null {
  if (!password) return "Password is required.";
  if (mode === "sign-in") return null;
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use letters and numbers for a stronger password.";
  }
  return null;
}

/** Validate both fields; returns empty object when all valid. */
export function validateAuthFields(
  email: string,
  password: string,
  mode: "sign-in" | "sign-up",
): FieldErrors {
  const errors: FieldErrors = {};
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password, mode);
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  return errors;
}
