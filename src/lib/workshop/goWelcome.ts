/** Dispatched when the user should land on the Fantasy Forge welcome hearth. */
export const WORKSHOP_WELCOME_EVENT = "ddeasy:go-welcome";

export function dispatchWorkshopWelcome(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSHOP_WELCOME_EVENT));
}
