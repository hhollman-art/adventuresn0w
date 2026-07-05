"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type OutputMarkdownCarouselProps = {
  html: string;
};

const ACTIVE_PANEL_CLASS = "output-document-panel-active";

function panelLabel(panel: Element, index: number): string {
  if (panel.classList.contains("module-toc-panel")) return "Contents";
  const heading = panel.querySelector("h1, h2");
  const text = heading?.textContent?.trim();
  if (text) return text;
  return `Section ${index + 1}`;
}

function getPanels(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const carousel = root.querySelector(".output-document-carousel");
  if (!carousel) return [];
  return Array.from(carousel.children).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && node.classList.contains("output-document-panel"),
  );
}

function syncVisiblePage(root: HTMLElement, target: number): HTMLElement[] {
  const panels = getPanels(root);
  if (panels.length === 0) return panels;

  const index = Math.max(0, Math.min(target, panels.length - 1));
  panels.forEach((panel, i) => {
    const active = i === index;
    panel.classList.toggle(ACTIVE_PANEL_CLASS, active);
    if (active) {
      panel.removeAttribute("hidden");
      panel.scrollTop = 0;
    } else {
      panel.setAttribute("hidden", "");
    }
  });
  return panels;
}

/**
 * Paginated output: page 1 = Contents, then one page per ## section.
 * innerHTML is updated only when `html` changes so page navigation does not wipe panel state.
 */
export default function OutputMarkdownCarousel({ html }: OutputMarkdownCarouselProps) {
  const rootRef = useRef<HTMLElement>(null);
  const mountedHtmlRef = useRef("");
  const pageIndexRef = useRef(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageLabel, setPageLabel] = useState("Contents");

  const goToPage = useCallback((index: number) => {
    pageIndexRef.current = Math.max(0, index);
    setPageIndex(pageIndexRef.current);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (mountedHtmlRef.current !== html) {
      root.innerHTML = html;
      mountedHtmlRef.current = html;
      pageIndexRef.current = 0;
      setPageIndex(0);
    }

    const panels = syncVisiblePage(root, pageIndexRef.current);
    setPageCount(panels.length);
    if (panels.length === 0) return;

    const target = Math.min(pageIndexRef.current, panels.length - 1);
    pageIndexRef.current = target;
    setPageLabel(panelLabel(panels[target]!, target));
    setPageIndex((prev) => (prev === target ? prev : target));
  }, [html, pageIndex]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest(".module-toc-list a[href^='#']");
      if (!(link instanceof HTMLAnchorElement)) return;
      const hash = link.getAttribute("href");
      if (!hash || hash.length < 2) return;
      event.preventDefault();
      const id = decodeURIComponent(hash.slice(1));
      const panel = root.querySelector(`#${CSS.escape(id)}`);
      if (!(panel instanceof HTMLElement)) return;
      const panels = getPanels(root);
      const index = panels.indexOf(panel);
      if (index >= 0) goToPage(index);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html, goToPage]);

  return (
    <div className="output-document-carousel-root mt-6">
      {pageCount > 1 ? (
        <div
          className="output-document-carousel-toolbar no-print"
          role="navigation"
          aria-label="Output pages"
        >
          <button
            type="button"
            className="output-document-carousel-btn"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex <= 0}
            aria-label="Previous page"
          >
            ← Previous
          </button>
          <div className="output-document-carousel-status" aria-live="polite">
            <span className="output-document-carousel-status-label">{pageLabel}</span>
            <span className="output-document-carousel-status-count">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <div className="output-document-carousel-page-list" role="group" aria-label="Jump to page">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`output-document-carousel-page-btn${
                    i === pageIndex ? " output-document-carousel-page-btn-active" : ""
                  }`}
                  aria-label={i === 0 ? "Contents" : `Page ${i + 1}`}
                  aria-current={i === pageIndex ? "page" : undefined}
                  onClick={() => goToPage(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="output-document-carousel-btn"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      ) : null}
      <div className="output-document-carousel-viewport">
        <article
          ref={rootRef}
          className="adventure-md output-document-view max-w-none text-[var(--text)] paper-module-layout"
        />
      </div>
    </div>
  );
}
