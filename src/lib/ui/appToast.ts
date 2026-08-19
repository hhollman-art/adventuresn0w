export const APP_TOAST_EVENT = "ddeasy-app-toast";

export type AppToastTone = "info" | "success" | "warn";

export type AppToastDetail = {
  message: string;
  tone?: AppToastTone;
};

/** Subtle status toast for campaign links, vault parks, and context actions. */
export function emitAppToast(message: string, tone: AppToastTone = "info"): void {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(
    new CustomEvent<AppToastDetail>(APP_TOAST_EVENT, {
      detail: { message, tone },
    }),
  );
}
