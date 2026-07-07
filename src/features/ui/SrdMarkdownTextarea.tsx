"use client";

import { useRef, type TextareaHTMLAttributes } from "react";
import SrdEntityCombobox from "@/features/ui/SrdEntityCombobox";
import { readSrdEntityDragData } from "@/lib/srd/srdDragDrop";
import { formatSrdToken, insertTextAtCursor } from "@/lib/srd/srdTokens";
import type { SrdEntityKind } from "@/lib/srd/types";

type SrdMarkdownTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  /** Limit autocomplete / drop to these entity kinds. */
  kinds?: readonly SrdEntityKind[];
  showInsertBar?: boolean;
};

export default function SrdMarkdownTextarea({
  value,
  onChange,
  kinds,
  showInsertBar = true,
  className = "",
  ...textareaProps
}: SrdMarkdownTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertEntity = (entityId: Parameters<typeof formatSrdToken>[0], trailingSpace = true) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const token = formatSrdToken(entityId) + (trailingSpace ? " " : "");
    insertTextAtCursor(textarea, value, token, onChange);
  };

  return (
    <div className="flex flex-col gap-2">
      {showInsertBar ? (
        <div
          className="flex flex-wrap items-end gap-2 rounded-lg border px-2 py-2"
          style={{ borderColor: "var(--border)", background: "rgba(154, 116, 22, 0.03)" }}
        >
          <SrdEntityCombobox
            label="Insert SRD reference"
            kinds={kinds}
            placeholder="Search spells, rules, monsters…"
            onSelect={(entity) => insertEntity(entity.id)}
            className="min-w-[12rem] flex-1"
          />
          <p className="pb-1 text-[10px] text-[var(--muted)]">
            Inserts a rule link token, or drag from the Library Rule tomes shelf.
          </p>
        </div>
      ) : null}
      <textarea
        {...textareaProps}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-ddeasy-srd-entity")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(e) => {
          const payload = readSrdEntityDragData(e.dataTransfer);
          if (!payload) return;
          e.preventDefault();
          insertEntity(payload.entityId);
        }}
        className={className}
      />
    </div>
  );
}
