import type { Locator, Page } from "@playwright/test";

/** MIME types the App's drag sources write (`src/lib/vault/cfDragDrop.ts`, `src/lib/srd/srdDragDrop.ts`). */
export const VAULT_CF_DRAG_MIME = "application/x-ddeasy-vault-cf";
export const SRD_ENTITY_DRAG_MIME = "application/x-ddeasy-srd-entity";

/** Mirror of `VaultDragPayload` — kept structural so specs never import app code. */
export type VaultDragPayload = {
  vaultKind: "cf";
  id: string;
  ciClass: string;
  title: string;
  detail: string;
};

export type DragCargo =
  /** A Lore Vault card (`setVaultDragData`, effectAllowed "all"). */
  | { kind: "vault"; payload: VaultDragPayload }
  /** A Library SRD row (`setSrdEntityDragData`, effectAllowed "copyLink"). */
  | { kind: "srd"; entityId: string; name: string }
  /** Whatever the source element's own `dragstart` handler writes (real app card). */
  | { kind: "native" };

export type DragOverResult = {
  /** True when the zone called preventDefault — i.e. the browser would allow the drop. */
  accepted: boolean;
  dropEffect: string;
};

export type DropResult = {
  accepted: boolean;
  /** Page-clock ms from dispatching `drop` until `expect.text` rendered in `expect.within`. */
  renderMs: number | null;
};

export type DropExpectation = {
  /** Container to watch (usually the drop zone itself). */
  within: Locator;
  text: string;
  timeoutMs?: number;
};

type DragWindow = Window & {
  __e2eDrag?: { dataTransfer: DataTransfer; source: Element };
  __e2eRestoreDataTransfer?: () => void;
};

/**
 * Simulates a native HTML5 drag across panel boundaries.
 *
 * Playwright's mouse-driven `dragTo` cannot carry custom `DataTransfer` MIME
 * payloads between unrelated React trees, so this dispatches the real DOM
 * event sequence (dragstart → dragenter → dragover → drop → dragend) with ONE
 * shared `DataTransfer` stored on `window`. Every phase is a separate call so a
 * spec can assert intermediate UI (hover highlights) between phases.
 */
export class Html5DragSession {
  private constructor(private readonly page: Page) {}

  /** Fire `dragstart` on `source` (bubbles to window listeners such as VaultDrawerContext). */
  static async start(page: Page, source: Locator, cargo: DragCargo): Promise<Html5DragSession> {
    await source.evaluate(
      (el, { cargo, vaultMime, srdMime }) => {
        // Outside an OS drag session Chromium pins effectAllowed and dropEffect to
        // "none" and ignores writes. Back both with plain values for the session
        // so the App negotiates effects as it would on a trusted drag; drop()
        // restores the native accessors.
        const restore: (() => void)[] = [];
        for (const prop of ["effectAllowed", "dropEffect"] as const) {
          const native = Object.getOwnPropertyDescriptor(DataTransfer.prototype, prop)!;
          let value = prop === "effectAllowed" ? "uninitialized" : "none";
          Object.defineProperty(DataTransfer.prototype, prop, {
            configurable: true,
            get: () => value,
            set: (next: string) => {
              value = next;
            },
          });
          restore.push(() => Object.defineProperty(DataTransfer.prototype, prop, native));
        }
        (window as DragWindow).__e2eRestoreDataTransfer = () => restore.forEach((undo) => undo());
        const dataTransfer = new DataTransfer();
        if (cargo.kind === "vault") {
          dataTransfer.setData(vaultMime, JSON.stringify(cargo.payload));
          dataTransfer.setData("text/plain", cargo.payload.title);
          dataTransfer.effectAllowed = "all";
        } else if (cargo.kind === "srd") {
          dataTransfer.setData(srdMime, JSON.stringify({ entityId: cargo.entityId, name: cargo.name }));
          dataTransfer.setData("text/plain", cargo.name);
          dataTransfer.effectAllowed = "copyLink";
        }
        (window as DragWindow).__e2eDrag = { dataTransfer, source: el };
        el.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }));
      },
      { cargo, vaultMime: VAULT_CF_DRAG_MIME, srdMime: SRD_ENTITY_DRAG_MIME },
    );
    return new Html5DragSession(page);
  }

  /** Fire `dragenter` + `dragover` at the centre of `target`. */
  async over(target: Locator): Promise<DragOverResult> {
    return target.evaluate((el) => {
      const drag = (window as DragWindow).__e2eDrag;
      if (!drag) throw new Error("Html5DragSession.over() called before start()");
      const rect = el.getBoundingClientRect();
      const init: DragEventInit = {
        bubbles: true,
        cancelable: true,
        dataTransfer: drag.dataTransfer,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      el.dispatchEvent(new DragEvent("dragenter", init));
      const over = new DragEvent("dragover", init);
      el.dispatchEvent(over);
      return { accepted: over.defaultPrevented, dropEffect: drag.dataTransfer.dropEffect };
    });
  }

  /**
   * Fire `drop` on `target`, then `dragend` on the original source. With
   * `expectation`, a MutationObserver is armed *before* the drop so `renderMs`
   * is the real drop-to-paint latency, not Playwright's polling interval.
   */
  async drop(target: Locator, expectation?: DropExpectation): Promise<DropResult> {
    const watch = expectation ? await expectation.within.elementHandle() : null;
    try {
      return await target.evaluate(
        async (el, { watch, text, timeoutMs }) => {
          const drag = (window as DragWindow).__e2eDrag;
          if (!drag) throw new Error("Html5DragSession.drop() called before start()");

          let rendered: Promise<number | null> = Promise.resolve(null);
          const startedAt = performance.now();
          if (watch && text) {
            if ((watch.textContent ?? "").includes(text)) {
              throw new Error(`"${text}" was already inside the drop target before the drop`);
            }
            rendered = new Promise<number>((resolve, reject) => {
              const observer = new MutationObserver(() => {
                if (!(watch.textContent ?? "").includes(text)) return;
                observer.disconnect();
                window.clearTimeout(timer);
                resolve(performance.now() - startedAt);
              });
              const timer = window.setTimeout(() => {
                observer.disconnect();
                reject(new Error(`"${text}" did not render within ${timeoutMs}ms of the drop`));
              }, timeoutMs);
              observer.observe(watch, { childList: true, subtree: true, characterData: true });
            });
          }

          const rect = el.getBoundingClientRect();
          const drop = new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: drag.dataTransfer,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
          });
          el.dispatchEvent(drop);
          drag.source.dispatchEvent(
            new DragEvent("dragend", { bubbles: true, dataTransfer: drag.dataTransfer }),
          );
          delete (window as DragWindow).__e2eDrag;
          (window as DragWindow).__e2eRestoreDataTransfer?.();
          delete (window as DragWindow).__e2eRestoreDataTransfer;
          return { accepted: drop.defaultPrevented, renderMs: await rendered };
        },
        { watch, text: expectation?.text ?? null, timeoutMs: expectation?.timeoutMs ?? 5_000 },
      );
    } finally {
      await watch?.dispose();
    }
  }
}
