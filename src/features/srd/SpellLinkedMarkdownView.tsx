"use client";

import { useEffect, useRef } from "react";
import OutputMarkdownCarousel from "@/features/workshop/OutputMarkdownCarousel";
import { previewMarkdownToHtml } from "@/lib/workshop/previewExport";
import { mountSpellLaunchersInElement } from "@/lib/srd/spellMarkdownEnrichment";
import { useWorkspaceRouterOptional } from "@/contexts/WorkspaceContextRouter";
import { openSrdSpellPreview } from "@/lib/srd/openSrdPreview";

type SpellLinkedMarkdownViewProps = {
  markdown: string;
  /** When true, paginate like the Scrying Glass output carousel. */
  carousel?: boolean;
  isSrd?: boolean;
  className?: string;
};

export default function SpellLinkedMarkdownView({
  markdown,
  carousel = false,
  isSrd = false,
  className = "",
}: SpellLinkedMarkdownViewProps) {
  const rootRef = useRef<HTMLElement>(null);
  const router = useWorkspaceRouterOptional();
  const html = previewMarkdownToHtml(markdown, isSrd);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !markdown.trim()) return;

    const openSpell =
      router?.openScryingSpell ??
      ((spell: { id: string; name: string }) => {
        openSrdSpellPreview(spell);
      });

    mountSpellLaunchersInElement(root, openSpell);
  }, [html, markdown, router]);

  if (carousel) {
    return <OutputMarkdownCarousel html={html} enableSpellLinks />;
  }

  return (
    <article
      ref={rootRef}
      className={`adventure-md spell-linked-markdown max-w-none text-[var(--text)] paper-module-layout ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
