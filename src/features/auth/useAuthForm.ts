"use client";

import { useCallback, useEffect, useState } from "react";
import { validateAuthFields, type FieldErrors } from "@/lib/auth/validation";
import type { DmAuthSession, DmLoginResponse, UserTier } from "@/lib/auth/types";

export type AuthMode = "sign-in" | "sign-up";

type AuthSuccessPayload = {
  redirectTo: string;
  session: DmAuthSession;
  tier: UserTier;
};

type UseAuthFormOptions = {
  /** Override server redirect (e.g. from `?returnTo=/dashboard`). */
  returnTo?: string | null;
  /** Called after a successful login or registration before redirect. */
  onSuccess?: (payload: AuthSuccessPayload) => void;
  /** Dev/testing — pre-fill the sign-in form when quick-login "Fill form" is used. */
  preset?: { email: string; password: string } | null;
};

/**
 * Shared form state for sign-in and sign-up modes.
 *
 * Premium billing hook (future): in `onSuccess`, call `/api/billing/status`
 * and redirect to `/pricing` when `tier === "free"` and the user attempted
 * a premium-only destination.
 */
export function useAuthForm({ returnTo, onSuccess, preset }: UseAuthFormOptions = {}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const switchMode = useCallback((next: AuthMode) => {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
    setTouched({ email: false, password: false });
  }, []);

  useEffect(() => {
    if (!preset) return;
    setMode("sign-in");
    setEmail(preset.email);
    setPassword(preset.password);
    setFieldErrors({});
    setFormError(null);
    setTouched({ email: false, password: false });
  }, [preset]);

  const validateClient = useCallback(() => {
    const errors = validateAuthFields(email, password, mode);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password, mode]);

  const submit = useCallback(async () => {
    setTouched({ email: true, password: true });
    if (!validateClient()) return;

    setLoading(true);
    setFormError(null);
    const endpoint = mode === "sign-in" ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as Partial<DmLoginResponse> & {
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setFormError(data.error ?? "Something went wrong.");
        return;
      }

      if (!data.session || !data.redirectTo) {
        setFormError("Unexpected response from the server.");
        return;
      }

      const redirectTo =
        returnTo && returnTo.startsWith("/") ? returnTo : data.redirectTo;
      onSuccess?.({
        redirectTo,
        session: data.session,
        tier: data.session.dm.tier,
      });
      window.location.href = redirectTo;
    } catch {
      setFormError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password, mode, validateClient, onSuccess, returnTo]);

  const onBlurEmail = useCallback(() => {
    setTouched((t) => ({ ...t, email: true }));
    const errors = validateAuthFields(email, password, mode);
    setFieldErrors((prev) => ({ ...prev, email: errors.email }));
  }, [email, password, mode]);

  const onBlurPassword = useCallback(() => {
    setTouched((t) => ({ ...t, password: true }));
    const errors = validateAuthFields(email, password, mode);
    setFieldErrors((prev) => ({ ...prev, password: errors.password }));
  }, [email, password, mode]);

  return {
    mode,
    switchMode,
    email,
    setEmail,
    password,
    setPassword,
    fieldErrors,
    formError,
    loading,
    touched,
    submit,
    onBlurEmail,
    onBlurPassword,
  };
}
