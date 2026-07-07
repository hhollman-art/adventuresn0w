/** Trigger a browser download for JSON export data. */
export function downloadJsonFile(filename: string, data: unknown): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  triggerDownload(filename, blob);
}

/** Trigger a browser download for plain text (macros, instructions). */
export function downloadTextFile(filename: string, contents: string, mime = "text/plain;charset=utf-8"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: mime });
  triggerDownload(filename, blob);
}

/** Save a data URL image as a PNG file (paired with Foundry scene JSON). */
export function downloadDataUrlImage(filename: string, dataUrl: string): void {
  if (typeof window === "undefined" || !dataUrl.startsWith("data:")) return;
  fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => triggerDownload(filename, blob))
    .catch(() => undefined);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Safe filename slug for export bundles. */
export function exportFileSlug(name: string, fallback = "export"): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
