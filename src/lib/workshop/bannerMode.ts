/** Which site banner layout to show — welcome hearth vs compact workspace chrome. */
export type ForgeBannerMode = "welcome" | "compact";

export const FORGE_BANNER_MODE_EVENT = "ddeasy:forge-banner-mode";

export function setForgeBannerMode(mode: ForgeBannerMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.forgeBanner = mode;
  window.dispatchEvent(new CustomEvent<ForgeBannerMode>(FORGE_BANNER_MODE_EVENT, { detail: mode }));
}

export function getForgeBannerMode(): ForgeBannerMode {
  if (typeof document === "undefined") return "welcome";
  return document.documentElement.dataset.forgeBanner === "compact" ? "compact" : "welcome";
}
