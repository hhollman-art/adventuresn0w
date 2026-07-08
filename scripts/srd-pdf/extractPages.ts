import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { PdfPageText } from "./types.js";

const require = createRequire(import.meta.url);

export type PdfEngine = "pdfjs" | "pdf-parse";

export type ExtractOptions = {
  pdfPath: string;
  engine: PdfEngine;
  onPage?: (page: PdfPageText, index: number, total: number) => void;
};

/** Page-by-page extraction via pdfjs-dist (memory-safe for large SRD PDFs). */
async function extractWithPdfJs(pdfPath: string, onPage?: ExtractOptions["onPage"]): Promise<PdfPageText[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { getDocument, GlobalWorkerOptions } = pdfjs;

  const pdfjsPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  GlobalWorkerOptions.workerSrc = pathToFileURL(
    join(dirname(pdfjsPath), "pdf.worker.mjs"),
  ).href;

  const buffer = await readFile(pdfPath);
  const loadingTask = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  const doc = await loadingTask.promise;
  const pages: PdfPageText[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    const items = content.items
      .filter((item): item is { str: string; transform: number[] } => "str" in item)
      .map((item) => ({
        str: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
      }))
      .sort((a, b) => {
        const dy = b.y - a.y;
        if (Math.abs(dy) > 2) return dy;
        return a.x - b.x;
      });

    const lines: string[] = [];
    let current = "";
    let lastY: number | null = null;

    for (const item of items) {
      if (lastY !== null && Math.abs(item.y - lastY) > 4) {
        if (current.trim()) lines.push(current.trim());
        current = item.str;
      } else {
        current += item.str.endsWith("-") || current === "" ? item.str : ` ${item.str}`;
      }
      lastY = item.y;
    }
    if (current.trim()) lines.push(current.trim());

    const text = lines.join("\n");
    const pageText: PdfPageText = { pageNumber, text, charCount: text.length };
    pages.push(pageText);
    onPage?.(pageText, pageNumber - 1, doc.numPages);
    page.cleanup();
  }

  await doc.destroy();
  return pages;
}

/** Whole-document extraction via pdf-parse (simple path; loads full PDF into memory). */
async function extractWithPdfParse(pdfPath: string, onPage?: ExtractOptions["onPage"]): Promise<PdfPageText[]> {
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await readFile(pdfPath);
  const result = await pdfParse(buffer);
  const fullText = String(result.text ?? "");
  const pageCount = Number(result.numpages ?? 1);

  if (typeof result.text === "string" && pageCount <= 1) {
    const single: PdfPageText = { pageNumber: 1, text: fullText, charCount: fullText.length };
    onPage?.(single, 0, 1);
    return [single];
  }

  // pdf-parse returns one string — split on form-feed page breaks when present.
  const chunks = fullText.split(/\f/g);
  const pages: PdfPageText[] = chunks.map((text, index) => {
    const pageNumber = index + 1;
    const pageText: PdfPageText = { pageNumber, text: text.trim(), charCount: text.trim().length };
    onPage?.(pageText, index, chunks.length);
    return pageText;
  });

  if (pages.length === 0) {
    const fallback: PdfPageText = { pageNumber: 1, text: fullText, charCount: fullText.length };
    onPage?.(fallback, 0, 1);
    return [fallback];
  }

  return pages;
}

export async function extractPdfPages(options: ExtractOptions): Promise<PdfPageText[]> {
  if (options.engine === "pdf-parse") {
    return extractWithPdfParse(options.pdfPath, options.onPage);
  }
  return extractWithPdfJs(options.pdfPath, options.onPage);
}

export function joinPages(pages: PdfPageText[]): string {
  return pages
    .map((page) => `<!-- page:${page.pageNumber} -->\n${page.text}`)
    .join("\n\n");
}

/** Strip recurring PDF header/footer noise (page numbers, document title repeats). */
export function cleanPdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*\d+\s*$/gm, "")
    .replace(/^System Reference Document.*$/gim, "")
    .replace(/^SRD_CC_v5\.2\.1.*$/gim, "")
    .replace(/([a-z])-\n([a-z])/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
