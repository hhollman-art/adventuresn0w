import { renderMarkdownToHtml } from "@/lib/markdownRender";
import type { LibraryKind } from "@/lib/generationLibrary";

export type PreviewExportMode = LibraryKind | "library";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function firstHeading(md: string): string | null {
  const line = md
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  if (!line) return null;
  return line.replace(/^#\s+/, "").trim() || null;
}

export function fileBaseName(md: string, mode: PreviewExportMode): string {
  if (mode === "library") {
    return slugify(firstHeading(md) ?? "") || "ddeasy-library";
  }
  const fromTitle = firstHeading(md);
  const slug = slugify(fromTitle ?? "");
  if (slug) return slug;
  const prefix =
    mode === "realm"
      ? "ddeasy-realm"
      : mode === "adventure"
        ? "ddeasy-adventure"
        : mode === "characters"
          ? "ddeasy-characters"
          : mode === "props"
            ? "ddeasy-props"
            : "ddeasy-maps";
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function triggerDownloadFromDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function copyMarkdownText(md: string): void {
  if (!md.trim()) return;
  void navigator.clipboard.writeText(md);
}

export function downloadMarkdownFile(md: string, mode: PreviewExportMode): void {
  if (!md.trim()) return;
  const name = `${fileBaseName(md, mode)}.md`;
  triggerDownload(new Blob([md], { type: "text/markdown;charset=utf-8" }), name);
}

function markdownToBasicHtml(md: string): string {
  return renderMarkdownToHtml(md, "export", Boolean(md.trim()));
}

function buildStandaloneHtmlDocument(title: string, bodyHtml: string): string {
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; margin: 0; color: #111; background: #f2f2f0; line-height: 1.55; }
    main { max-width: 54rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    h1 { font-size: 1.75rem; margin: 0 0 1rem; }
    h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    h3 { font-size: 1.05rem; margin: 1.25rem 0 0.5rem; }
    p { margin: 0.5rem 0; }
    ul { margin: 0.5rem 0 0.75rem 1.25rem; }
    li { margin: 0.25rem 0; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <main>${bodyHtml}</main>
</body>
</html>`;
}

/** @deprecated Prefer Print / Save as PDF or Export DMMS JSON from the Scrying Glass. */
export function downloadHtmlFile(md: string, mode: PreviewExportMode): void {
  if (!md.trim()) return;
  const title =
    firstHeading(md) ??
    (mode === "realm"
      ? "Realm"
      : mode === "adventure"
        ? "Adventure"
        : mode === "characters"
          ? "Heroes"
          : mode === "props"
            ? "Items"
            : "Maps");
  const doc = buildStandaloneHtmlDocument(title, markdownToBasicHtml(md));
  const name = `${fileBaseName(md, mode)}.html`;
  triggerDownload(new Blob([doc], { type: "text/html;charset=utf-8" }), name);
}

/** Portable Creation File envelope for backup or sharing with another DM. */
export type DmmsCreationFileExport = {
  format: "ddeasy-creation-file";
  version: 1;
  ciClass: string | null;
  kind: string;
  title: string;
  markdown: string;
  images: { kind: string; label?: string; imageDataUrl: string }[];
  textModel: string | null;
  imageModel: string | null;
  exportedAt: string;
};

export function buildDmmsCreationFileExport(input: {
  markdown: string;
  images: { kind: string; label?: string; imageDataUrl: string }[];
  textModel: string | null;
  imageModel: string | null;
  mode: PreviewExportMode;
  ciClass: string | null;
}): DmmsCreationFileExport {
  const title =
    firstHeading(input.markdown) ??
    (input.mode === "realm"
      ? "Realm"
      : input.mode === "adventure"
        ? "Adventure"
        : input.mode === "characters"
          ? "Heroes"
          : input.mode === "props"
            ? "Items"
            : input.mode === "maps"
              ? "Maps"
              : "Creation File");
  return {
    format: "ddeasy-creation-file",
    version: 1,
    ciClass: input.ciClass,
    kind: input.mode,
    title,
    markdown: input.markdown,
    images: input.images,
    textModel: input.textModel,
    imageModel: input.imageModel,
    exportedAt: new Date().toISOString(),
  };
}

export function downloadDmmsCreationFileJson(input: {
  markdown: string;
  images: { kind: string; label?: string; imageDataUrl: string }[];
  textModel: string | null;
  imageModel: string | null;
  mode: PreviewExportMode;
  ciClass: string | null;
}): void {
  if (!input.markdown.trim() && input.images.length === 0) return;
  const payload = buildDmmsCreationFileExport(input);
  const name = `${fileBaseName(input.markdown, input.mode)}.ddeasy.json`;
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    name,
  );
}

export function previewMarkdownToHtml(md: string, isSrd: boolean): string {
  return isSrd
    ? renderMarkdownToHtml(md, "preview", false)
    : renderMarkdownToHtml(md, "preview", true);
}

export function downloadMapImage(imageDataUrl: string, labelOrKind: string, baseName: string): void {
  const slug = slugify(labelOrKind) || "map";
  triggerDownloadFromDataUrl(imageDataUrl, `${baseName}-${slug}.png`);
}
