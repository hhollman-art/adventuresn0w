/** Markdown → HTML for in-app preview and standalone export (adventure & realm booklet sheet layout optional). */

export type MarkdownHtmlVariant = "preview" | "export";

type MdClassSet = {
  pre: string;
  h1: string;
  h2: string;
  h3: string;
  ulOpen: string;
  blockquote: string;
  quoteP: string;
  p: string;
  h4Keyed: string;
  tableWrap: string;
  table: string;
};

const PREVIEW_CLASSES: MdClassSet = {
  pre:
    "my-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[rgba(154,116,22,0.07)] p-3 text-left font-mono text-xs leading-tight text-[var(--text)]",
  h1: "text-2xl font-bold mt-6 mb-3",
  h2: "module-sheet-heading text-lg font-semibold mt-0 mb-3 text-[var(--accent)]",
  h3: "text-base font-semibold mt-4 mb-2",
  ulOpen: 'list-disc pl-5 space-y-1 my-2',
  blockquote:
    'module-read-aloud my-4 rounded-r-lg border-l-4 bg-[rgba(154,116,22,0.07)] py-3 pl-4 pr-3 text-[var(--text)]/95 italic',
  quoteP: "my-2 leading-relaxed not-italic first:mt-0 last:mb-0",
  p: "my-2 leading-relaxed text-[var(--text)]/95",
  h4Keyed:
    "module-keyed-heading mt-3 mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]",
  tableWrap: "module-table-scroll my-4 overflow-x-auto",
  table:
    "module-glance-table w-full border-collapse text-left text-sm text-[var(--text)]",
};

const EXPORT_CLASSES: MdClassSet = {
  pre: "map-pre",
  h1: "module-cover-title",
  h2: "module-sheet-heading",
  h3: "module-h3",
  ulOpen: "",
  blockquote: "module-read-aloud",
  quoteP: "read-aloud-inner",
  p: "",
  h4Keyed: "module-keyed-heading",
  tableWrap: "module-table-scroll",
  table: "module-glance-table",
};

function splitMarkdownTableRow(line: string): string[] | null {
  const t = line.trim();
  if (!t.includes("|")) return null;
  if (!t.startsWith("|")) return null;
  const cells = t
    .replace(/^\|\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
  return cells.some((c) => c.length > 0) ? cells : null;
}

function isMarkdownPipeTableSeparatorRow(line: string, cols: number): boolean {
  const cells = splitMarkdownTableRow(line);
  if (!cells || cells.length !== cols) return false;
  return cells.every((cell) =>
    /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")),
  );
}

function tryParseMarkdownPipeTable(
  lines: string[],
  start: number,
  inlineFmt: (s: string) => string,
  c: MdClassSet,
): { html: string; endExclusive: number } | null {
  if (start + 1 >= lines.length) return null;
  const hdr = splitMarkdownTableRow(lines[start]);
  const sepRow = lines[start + 1];
  if (hdr === null || hdr.length < 2 || !isMarkdownPipeTableSeparatorRow(sepRow, hdr.length)) {
    return null;
  }

  let j = start + 2;
  const bodyRows: string[][] = [];

  while (j < lines.length) {
    const rawLine = lines[j];
    const trimmedRight = rawLine.trimEnd();
    if (trimmedRight.trim() === "") break;
    const row = splitMarkdownTableRow(rawLine);
    if (row === null || row.length !== hdr.length) break;
    bodyRows.push(row);
    j++;
  }

  const th = hdr
    .map((cell) => `<th class="module-glance-th">${inlineFmt(cell)}</th>`)
    .join("");
  const trBody = bodyRows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td class="module-glance-td">${inlineFmt(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return {
    html: `<div class="${c.tableWrap}"><table class="${c.table}"><thead><tr>${th}</tr></thead><tbody>${trBody}</tbody></table></div>`,
    endExclusive: j,
  };
}

function elClass(classes: string): string {
  return classes.trim() ? ` class="${classes}"` : "";
}

export function slugifySectionId(title: string, used: Set<string>): string {
  const base =
    title
      .toLowerCase()
      .replace(/&[^;]+;/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "section";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

function buildTocNav(
  sections: { id: string; title: string }[],
  c: MdClassSet,
  inlineFmt: (s: string) => string,
): string {
  const heading = `<h2${elClass("module-toc-heading text-lg font-semibold text-[var(--accent)]")}>Contents</h2>`;
  if (sections.length === 0) {
    return `<nav class="output-document-panel module-toc-panel" aria-label="Table of contents">\n${heading}\n<p${elClass(c.p)}>This document has no sections yet.</p>\n</nav>`;
  }
  const items = sections
    .map(
      (s) =>
        `<li><a href="#${s.id}" class="module-toc-link">${inlineFmt(s.title)}</a></li>`,
    )
    .join("\n");
  return `<nav class="output-document-panel module-toc-panel" aria-label="Table of contents">\n${heading}\n<ol class="module-toc-list">${items}</ol>\n</nav>`;
}

/**
 * Minimal Markdown → HTML: headings (#–####), lists, bold, fenced code, blockquotes, GFM pipe tables.
 * When `paperModuleSheets` is true, `#` through first `##` becomes a cover &lt;header&gt;, then each `##` is a section “sheet” (print page breaks in CSS).
 */
export function renderMarkdownToHtml(
  md: string,
  variant: MarkdownHtmlVariant,
  paperModuleSheets: boolean,
): string {
  const c = variant === "preview" ? PREVIEW_CLASSES : EXPORT_CLASSES;
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const flatOut: string[] = [];
  const top: string[] = [];
  const coverBuf: string[] = [];
  let sheetBuf: string[] | null = null;
  let coverSealed = false;
  let emittedCoverHeader = false;
  const sectionIds = new Set<string>();
  const tocSections: { id: string; title: string }[] = [];
  let coverId: string | null = null;
  let coverTitle = "";
  let currentSheetId: string | null = null;
  /** Preview carousel: title block merged into first ## section instead of its own page. */
  let previewCoverHtml: string | null = null;

  let inUl = false;
  let inFence = false;
  const codeBuf: string[] = [];
  const quoteBuf: string[] = [];

  function emit(fragment: string) {
    if (!paperModuleSheets) {
      flatOut.push(fragment);
      return;
    }
    if (!coverSealed) {
      coverBuf.push(fragment);
      return;
    }
    if (sheetBuf) {
      sheetBuf.push(fragment);
    }
  }

  function flushUl() {
    if (inUl) {
      emit("</ul>");
      inUl = false;
    }
  }

  function flushCode() {
    if (codeBuf.length === 0) return;
    const raw = codeBuf.join("\n");
    codeBuf.length = 0;
    const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    emit(`<pre${elClass(c.pre)}><code>${escaped}</code></pre>`);
  }

  const inlineFmt = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  function flushQuote() {
    if (quoteBuf.length === 0) return;
    const parts: string[] = [];
    const cur: string[] = [];
    const pushPara = () => {
      const text = cur.join("\n").trim();
      if (text) parts.push(text);
      cur.length = 0;
    };
    for (const qLine of quoteBuf) {
      if (qLine.trim() === "") pushPara();
      else cur.push(qLine);
    }
    pushPara();
    quoteBuf.length = 0;
    const inner =
      parts.length > 0
        ? parts
            .map((para) => `<p${elClass(c.quoteP)}>${inlineFmt(para)}</p>`)
            .join("")
        : "";
    const quoteStyle =
      variant === "preview" ? ` style="border-color:var(--accent)"` : "";
    emit(`<blockquote class="${c.blockquote}"${quoteStyle}>${inner}</blockquote>`);
  }

  function beginNonQuoteLine() {
    flushUl();
    flushQuote();
  }

  function sealCover() {
    if (!paperModuleSheets || coverSealed) return;
    coverSealed = true;
    if (coverBuf.length > 0) {
      emittedCoverHeader = true;
      if (variant === "preview") {
        previewCoverHtml = coverBuf.join("\n");
      } else {
        const title = coverTitle || "Cover";
        coverId = slugifySectionId(title, sectionIds);
        tocSections.unshift({ id: coverId, title });
        top.push(
          `<header class="module-cover">\n${coverBuf.join("\n")}\n</header>`,
        );
      }
      coverBuf.length = 0;
    }
  }

  function closeSheet() {
    if (!paperModuleSheets || !sheetBuf || sheetBuf.length === 0) return;
    const id = currentSheetId ?? slugifySectionId("section", sectionIds);
    let inner = sheetBuf.join("\n");
    if (variant === "preview" && previewCoverHtml) {
      inner = `${previewCoverHtml}\n${inner}`;
      previewCoverHtml = null;
    }
    const panelClass =
      variant === "preview" ? "module-sheet output-document-panel" : "module-sheet";
    top.push(`<section class="${panelClass}" id="${id}">\n${inner}\n</section>`);
    sheetBuf = null;
    currentSheetId = null;
  }

  function openSheet(h2Html: string, plainTitle: string) {
    closeSheet();
    sealCover();
    const id = slugifySectionId(stripInlineMarkdown(plainTitle), sectionIds);
    tocSections.push({ id, title: stripInlineMarkdown(plainTitle) });
    currentSheetId = id;
    sheetBuf = [h2Html];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!inFence && quoteBuf.length === 0 && !trimmed.startsWith("```")) {
      const tbl = tryParseMarkdownPipeTable(lines, i, inlineFmt, c);
      if (tbl) {
        beginNonQuoteLine();
        emit(tbl.html);
        i = tbl.endExclusive - 1;
        continue;
      }
    }

    if (trimmed.startsWith("```")) {
      beginNonQuoteLine();
      if (inFence) {
        flushCode();
        inFence = false;
      } else {
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      codeBuf.push(line);
      continue;
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/);
    if (quoteMatch) {
      flushUl();
      quoteBuf.push(quoteMatch[1]);
      continue;
    }

    const t = line.trim();
    if (t.startsWith("# ")) {
      beginNonQuoteLine();
      const title = stripInlineMarkdown(t.slice(2));
      if (paperModuleSheets && !coverSealed && !coverTitle) {
        coverTitle = title;
      }
      emit(`<h1${elClass(c.h1)}>${inlineFmt(t.slice(2))}</h1>`);
      continue;
    }
    if (t.startsWith("## ")) {
      beginNonQuoteLine();
      const plain = t.slice(3);
      const h2Inner = inlineFmt(plain);
      const h2Html = `<h2${elClass(c.h2)}>${h2Inner}</h2>`;
      if (paperModuleSheets) {
        openSheet(h2Html, plain);
      } else {
        emit(h2Html);
      }
      continue;
    }
    if (t.startsWith("### ")) {
      beginNonQuoteLine();
      emit(`<h3${elClass(c.h3)}>${inlineFmt(t.slice(4))}</h3>`);
      continue;
    }
    if (t.startsWith("#### ")) {
      beginNonQuoteLine();
      emit(`<h4${elClass(c.h4Keyed)}>${inlineFmt(t.slice(5))}</h4>`);
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      beginNonQuoteLine();
      if (!inUl) {
        emit(`<ul${elClass(c.ulOpen)}>`);
        inUl = true;
      }
      emit(`<li>${inlineFmt(t.slice(2))}</li>`);
      continue;
    }
    beginNonQuoteLine();
    if (t === "") {
      emit(variant === "preview" ? "<br/>" : "<p><br /></p>");
    } else {
      emit(`<p${elClass(c.p)}>${inlineFmt(t)}</p>`);
    }
  }

  flushUl();
  flushQuote();
  if (inFence) flushCode();

  if (!paperModuleSheets) {
    return flatOut.join("\n");
  }

  if (!coverSealed) {
    coverSealed = true;
    if (coverBuf.length > 0) {
      emittedCoverHeader = true;
      const title = coverTitle || "Document";
      if (variant === "preview") {
        const id = slugifySectionId(title, sectionIds);
        tocSections.push({ id, title });
        top.push(
          `<section class="module-sheet output-document-panel" id="${id}">\n${coverBuf.join("\n")}\n</section>`,
        );
      } else {
        coverId = slugifySectionId(title, sectionIds);
        tocSections.unshift({ id: coverId, title });
        top.push(
          `<header class="module-cover" id="${coverId}">\n${coverBuf.join("\n")}\n</header>`,
        );
      }
      coverBuf.length = 0;
    }
  }
  closeSheet();

  const wrapperClass = [
    "module-adventure-document",
    "paper-module-layout",
    emittedCoverHeader ? "module-adventure-has-cover" : "module-adventure-no-cover",
  ].join(" ");

  if (variant === "preview") {
    const toc = buildTocNav(tocSections, c, inlineFmt);
    return `<div class="${wrapperClass}">\n<div class="output-document-carousel">\n${toc}\n${top.join("\n")}\n</div>\n</div>`;
  }

  return `<div class="${wrapperClass}">\n${top.join("\n")}\n</div>`;
}
