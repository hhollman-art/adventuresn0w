/**
 * Local-only Homebrew document ingest.
 *
 * Reads .pdf / .txt / .png / .jpg in the browser session before any network
 * call. Raw bytes never leave the client until the DM explicitly asks AI to
 * map extracted text/metadata into a Creation File schema (IP-safe path).
 */

export const HOMEBREW_ACCEPT =
  ".pdf,.txt,.png,.jpg,.jpeg,application/pdf,text/plain,image/png,image/jpeg";

export const HOMEBREW_EXTENSIONS = [".pdf", ".txt", ".png", ".jpg", ".jpeg"] as const;

export type HomebrewFileKind = "pdf" | "txt" | "png" | "jpg" | "unknown";

export type HomebrewIngestResult = {
  fileName: string;
  mimeType: string;
  kind: HomebrewFileKind;
  /** Extracted plain text (PDF/TXT) — stays local until AI map is requested. */
  text: string;
  /** Data URL for images (and optional PDF preview); local only. */
  dataUrl: string | null;
  /** Byte size of the original file. */
  byteLength: number;
  warnings: string[];
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function homebrewFileKind(file: File): HomebrewFileKind {
  const ext = extOf(file.name);
  if (ext === ".pdf" || file.type === "application/pdf") return "pdf";
  if (ext === ".txt" || file.type === "text/plain") return "txt";
  if (ext === ".png" || file.type === "image/png") return "png";
  if (ext === ".jpg" || ext === ".jpeg" || file.type === "image/jpeg") return "jpg";
  return "unknown";
}

export function isHomebrewDropFile(file: File): boolean {
  return homebrewFileKind(file) !== "unknown";
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

/** Extract text from a PDF entirely in the browser (pdfjs). */
async function extractPdfText(buffer: ArrayBuffer): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const pdfjs = await import("pdfjs-dist");
    // Worker from same package version — CDN keeps Next from bundling the worker.
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    const maxPages = Math.min(doc.numPages, 40);
    if (doc.numPages > maxPages) {
      warnings.push(`Only the first ${maxPages} of ${doc.numPages} pages were read.`);
    }
    for (let i = 1; i <= maxPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ("str" in item ? String(item.str) : ""))
        .filter(Boolean)
        .join(" ");
      if (line.trim()) pages.push(line.trim());
    }
    const text = pages.join("\n\n").trim();
    if (!text) {
      warnings.push("No extractable text found in this PDF (it may be image-only).");
    }
    return { text, warnings };
  } catch {
    return {
      text: "",
      warnings: ["Could not parse this PDF locally. Try a .txt export or paste the text."],
    };
  }
}

/**
 * Read a dropped/picked homebrew file locally. Never uploads the raw stream
 * by itself — callers decide whether to send extracted text/metadata to AI.
 */
export async function ingestHomebrewFile(file: File): Promise<HomebrewIngestResult> {
  const kind = homebrewFileKind(file);
  if (kind === "unknown") {
    throw new Error("Supported types: .pdf, .txt, .png, .jpg");
  }

  const base: Omit<HomebrewIngestResult, "text" | "dataUrl" | "warnings"> = {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    kind,
    byteLength: file.size,
  };

  if (kind === "txt") {
    const text = await file.text();
    return { ...base, text: text.trim(), dataUrl: null, warnings: [] };
  }

  if (kind === "pdf") {
    const buffer = await readAsArrayBuffer(file);
    const { text, warnings } = await extractPdfText(buffer);
    return { ...base, text, dataUrl: null, warnings };
  }

  // Images: keep data URL local; AI vision OCR is opt-in via the mapper API.
  const dataUrl = await readAsDataUrl(file);
  return {
    ...base,
    text: "",
    dataUrl,
    warnings: [
      "Image kept on this device. Use AI mapping to OCR / describe it into a Creation File.",
    ],
  };
}
