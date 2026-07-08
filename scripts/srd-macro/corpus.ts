import type { IndexRow } from "./types.js";
import { CHAPTER_PAGE_PREFIX } from "./taxonomy.js";

export type SrdCorpus = {
  body: string;
  index: IndexRow[];
  documentPdfId: string;
  edition: string;
};

export async function loadSrdCorpus(): Promise<SrdCorpus> {
  const [{ SRD_DOCUMENT_BODY }, { SRD_DOCUMENT_INDEX }, { SRD_DOCUMENT_PDF_ID }] = await Promise.all([
    import("../../src/lib/srd/srdDocument.data.ts"),
    import("../../src/lib/srd/srdDocumentIndex.data.ts"),
    import("../../src/lib/srd/srdDocument.data.ts"),
  ]);

  return {
    body: SRD_DOCUMENT_BODY,
    index: SRD_DOCUMENT_INDEX as IndexRow[],
    documentPdfId: SRD_DOCUMENT_PDF_ID,
    edition: "5.2.1",
  };
}

/** Resolve the ## chapter page prefix nearest to a byte offset in the bundled body. */
export function pagePrefixAtOffset(body: string, offset: number, chapter?: string): string {
  if (chapter && CHAPTER_PAGE_PREFIX[chapter]) {
    return CHAPTER_PAGE_PREFIX[chapter];
  }
  const prefix = body.slice(0, Math.max(0, offset));
  const matches = [...prefix.matchAll(/^## .+$/gm)];
  return matches.at(-1)?.[0] ?? "";
}

export function sliceMarkdown(body: string, start: number, end: number): string {
  return body.slice(start, end).trim();
}

export function sourceFileFor(row: IndexRow): string {
  return `srdDocumentIndex:${row.chapter}/${row.key}`;
}

export function attachRowMetadata(body: string, row: IndexRow) {
  return {
    key: row.key,
    title: row.title,
    markdown: sliceMarkdown(body, row.start, row.end),
    _source_file: sourceFileFor(row),
    chapter: row.chapter,
    start: row.start,
    end: row.end,
    pagePrefix: pagePrefixAtOffset(body, row.start, row.chapter),
    level: row.level,
  };
}

export function rowsInChapter(index: IndexRow[], chapter: string): IndexRow[] {
  return index.filter((row) => row.chapter === chapter).sort((a, b) => a.start - b.start);
}

export function rowsWithinSpan(index: IndexRow[], start: number, end: number): IndexRow[] {
  return index
    .filter((row) => row.start >= start && row.end <= end)
    .sort((a, b) => a.start - b.start);
}

export function countNodes(nodes: { children: unknown[] }[]): number {
  let count = 0;
  const walk = (list: { children: unknown[] }[]) => {
    for (const node of list) {
      count += 1;
      walk(node.children as { children: unknown[] }[]);
    }
  };
  walk(nodes);
  return count;
}
