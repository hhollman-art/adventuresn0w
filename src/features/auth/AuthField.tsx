"use client";

import type { InputHTMLAttributes } from "react";

type AuthFieldProps = {
  id: string;
  label: string;
  error?: string;
  showError?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

/** Accessible labeled input with DMMS auth error styling. */
export default function AuthField({
  id,
  label,
  error,
  showError = false,
  className = "",
  ...inputProps
}: AuthFieldProps) {
  const hasError = showError && Boolean(error);
  const describedBy = hasError ? `${id}-error` : undefined;

  return (
    <label htmlFor={id} className={`auth-field flex flex-col gap-1.5 ${className}`.trim()}>
      <span className="auth-field-label text-sm font-semibold">{label}</span>
      <input
        id={id}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={`auth-field-input ${hasError ? "auth-field-input--error" : ""}`.trim()}
        {...inputProps}
      />
      {hasError ? (
        <span id={describedBy} className="auth-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
