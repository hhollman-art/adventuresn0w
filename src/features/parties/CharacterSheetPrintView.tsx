"use client";

import { useEffect } from "react";
import CharacterSheetLayout from "@/features/characters/CharacterSheetLayout";
import type { PlayerCharacter } from "@/lib/tabletop/types";

type CharacterSheetPrintViewProps = {
  character: PlayerCharacter;
  onClose: () => void;
};

/**
 * Print-ready 5e-style character sheet. Opens a dedicated surface and triggers
 * window.print(); interactive chrome is hidden via @media print.
 */
export default function CharacterSheetPrintView({
  character: p,
  onClose,
}: CharacterSheetPrintViewProps) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${p.name} — Character Sheet`;
    return () => {
      document.title = prev;
    };
  }, [p.name]);

  return (
    <div className="character-sheet-print-overlay no-print-hide-self fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-3">
        <div className="no-print flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-sm btn-accent"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>

        <CharacterSheetLayout characterData={p} className="character-sheet-print" />
      </div>
    </div>
  );
}
