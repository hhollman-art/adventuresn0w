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
      top.push(
        `<header class="module-cover">\n${coverBuf.join("\n")}\n</header>`,
      );
      coverBuf.length = 0;
    }
  }

  function closeSheet() {
    if (!paperModuleSheets || !sheetBuf || sheetBuf.length === 0) return;
    top.push(`<section class="module-sheet">\n${sheetBuf.join("\n")}\n</section>`);
    sheetBuf = null;
  }

  function openSheet(h2Html: string) {
    closeSheet();
    sealCover();
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
      emit(`<h1${elClass(c.h1)}>${inlineFmt(t.slice(2))}</h1>`);
      continue;
    }
    if (t.startsWith("## ")) {
      beginNonQuoteLine();
      const h2Inner = inlineFmt(t.slice(3));
      const h2Html = `<h2${elClass(c.h2)}>${h2Inner}</h2>`;
      if (paperModuleSheets) {
        openSheet(h2Html);
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
      top.push(
        `<header class="module-cover">\n${coverBuf.join("\n")}\n</header>`,
      );
      coverBuf.length = 0;
    }
  }
  closeSheet();

  const wrapperClass = [
    "module-adventure-document",
    "paper-module-layout",
    emittedCoverHeader ? "module-adventure-has-cover" : "module-adventure-no-cover",
  ].join(" ");

  return `<div class="${wrapperClass}">\n${top.join("\n")}\n</div>`;
}
