"use client";

import { getSrdEntity } from "@/lib/srd/corpus";
import { openSrdEntityPreview } from "@/lib/srd/openSrdPreview";
import type { SrdEntityId } from "@/lib/srd/types";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

type SrdRefChipProps = {
  entityId: SrdEntityId;
  /** Override display name (defaults to corpus name). */
  name?: string;
  className?: string;
};

/** Inline chip that opens bundled SRD text in the Scrying Glass. */
export default function SrdRefChip({ entityId, name, className = "" }: SrdRefChipProps) {
  const entity = getSrdEntity(entityId);
  const label = name ?? entity?.name ?? entityId;

  return (
    <button
      type="button"
      onClick={() => openSrdEntityPreview(entityId)}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)] hover:bg-[rgba(201,162,39,0.12)] ${className}`}
      style={{ borderColor: "var(--accent-dim)" }}
      title={`Open ${label} in the ${PREVIEW_WINDOW}`}
    >
      {label}
    </button>
  );
}
