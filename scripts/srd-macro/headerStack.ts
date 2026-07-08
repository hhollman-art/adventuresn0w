/**
 * Streaming header stack — accumulates text buffers under parent headings.
 *
 * Boundaries are determined by markdown heading depth (# … ######) or PDF-style
 * section titles, NOT by page breaks.
 */

export type HeaderFrame = {
  level: number;
  key: string;
  title: string;
  lines: string[];
  pageNumber: number | null;
  startLine: number;
};

export type FlushedSection = {
  level: number;
  key: string;
  title: string;
  markdown: string;
  pageNumber: number | null;
  startLine: number;
  endLine: number;
};

export type HeaderStackOptions = {
  /** Minimum heading level treated as a structural boundary (1 = #, 2 = ##). */
  minBoundaryLevel?: number;
  onFlush?: (section: FlushedSection) => void;
};

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const PDF_SECTION_RE =
  /^(?:Step \d+:|(?:Playing the Game|Character Creation|Combat|Spells|Rules Glossary|Character Classes|[A-Z][A-Za-z' ]+))\s*$/;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[action\]/gi, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function headingLevel(line: string): number | null {
  const match = line.match(HEADING_RE);
  return match ? match[1].length : null;
}

function headingTitle(line: string): string | null {
  const match = line.match(HEADING_RE);
  return match ? match[2].trim() : null;
}

function detectPdfSectionLevel(line: string): number | null {
  const trimmed = line.trim();
  if (/^Step \d+:/i.test(trimmed)) return 4;
  if (/^(Playing the Game|Character Creation|Character Classes|Rules Glossary|Combat|Spells)$/i.test(trimmed)) {
    return 2;
  }
  if (PDF_SECTION_RE.test(trimmed) && trimmed === trimmed.toUpperCase() && trimmed.length > 4) return 3;
  return null;
}

/**
 * Push plain-text lines through a header stack; flush completed sections via callback.
 * Use when streaming PDF page text chunk-by-chunk.
 */
export class HeaderStackBuffer {
  private readonly minLevel: number;
  private readonly onFlush: ((section: FlushedSection) => void) | undefined;
  private readonly stack: HeaderFrame[] = [];
  private lineNumber = 0;
  private currentPage: number | null = null;

  constructor(options: HeaderStackOptions = {}) {
    this.minLevel = options.minBoundaryLevel ?? 2;
    this.onFlush = options.onFlush;
  }

  notePage(pageNumber: number): void {
    this.currentPage = pageNumber;
  }

  pushLine(rawLine: string): void {
    this.lineNumber += 1;
    const line = rawLine.trimEnd();

    const pageMatch = line.match(/^<!--\s*page:(\d+)\s*-->$/);
    if (pageMatch) {
      this.currentPage = Number(pageMatch[1]);
      return;
    }

    const mdLevel = headingLevel(line);
    const pdfLevel = mdLevel ?? detectPdfSectionLevel(line);
    const title = mdLevel ? headingTitle(line) : pdfLevel ? line.trim() : null;

    if (pdfLevel != null && pdfLevel >= this.minLevel && title) {
      this.flushThrough(pdfLevel);
      this.stack.push({
        level: pdfLevel,
        key: slugify(title),
        title,
        lines: [line],
        pageNumber: this.currentPage,
        startLine: this.lineNumber,
      });
      return;
    }

    if (this.stack.length === 0) {
      this.stack.push({
        level: 1,
        key: "preamble",
        title: "Preamble",
        lines: [line],
        pageNumber: this.currentPage,
        startLine: this.lineNumber,
      });
      return;
    }

    this.stack[this.stack.length - 1].lines.push(line);
  }

  pushChunk(text: string): void {
    for (const line of text.split("\n")) {
      this.pushLine(line);
    }
  }

  finish(): FlushedSection[] {
    const flushed: FlushedSection[] = [];
    while (this.stack.length > 0) {
      const section = this.popFrame(this.lineNumber);
      if (section) flushed.push(section);
    }
    for (const section of flushed) {
      this.onFlush?.(section);
    }
    return flushed;
  }

  private flushThrough(level: number): void {
    while (this.stack.length > 0 && this.stack[this.stack.length - 1].level >= level) {
      const section = this.popFrame(this.lineNumber);
      if (section) this.onFlush?.(section);
    }
  }

  private popFrame(endLine: number): FlushedSection | null {
    const frame = this.stack.pop();
    if (!frame) return null;
    const markdown = frame.lines.join("\n").trim();
    if (!markdown) return null;
    return {
      level: frame.level,
      key: frame.key,
      title: frame.title,
      markdown,
      pageNumber: frame.pageNumber,
      startLine: frame.startLine,
      endLine,
    };
  }
}

/**
 * Build nested section tree from flat index rows (header-identified boundaries).
 */
export function nestIndexRows<T extends { level: number }>(
  rows: T[],
  attach: (row: T) => Omit<import("./types.js").MacroSectionNode, "children">,
): import("./types.js").MacroSectionNode[] {
  const root: import("./types.js").MacroSectionNode[] = [];
  const stack: { level: number; children: import("./types.js").MacroSectionNode[] }[] = [
    { level: 0, children: root },
  ];

  for (const row of rows) {
    while (stack.length > 1 && row.level <= stack[stack.length - 1].level) {
      stack.pop();
    }
    const node: import("./types.js").MacroSectionNode = {
      ...attach(row),
      children: [],
    };
    stack[stack.length - 1].children.push(node);
    stack.push({ level: row.level, children: node.children });
  }

  return root;
}
