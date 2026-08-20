"use client";

import CreateNewHubForm from "@/features/workshop/CreateNewHubForm";
import type { CreateNewKind } from "@/lib/workshop/powerWorkspaceMachine";

/**
 * Legacy overlay wrapper. Command Center renders Create New in the Scrying inspector.
 * Kept so any remaining callers still work (preserve-and-expand).
 */
export default function CreateNewHubDialog({
  open,
  initialKind,
  homebrewPreferred = true,
  onClose,
  onHomebrewChange,
}: {
  open: boolean;
  initialKind?: CreateNewKind | null;
  homebrewPreferred?: boolean;
  onClose: () => void;
  onHomebrewChange?: (value: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-new-hub-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border p-4 shadow-xl"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <CreateNewHubForm
          initialKind={initialKind}
          homebrewPreferred={homebrewPreferred}
          onClose={onClose}
          onHomebrewChange={onHomebrewChange}
        />
      </div>
    </div>
  );
}
