"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateNewKind } from "@/lib/workshop/powerWorkspaceMachine";
import { usePowerWorkspaceOptional } from "@/features/workshop/PowerWorkspaceProvider";
import HomebrewDocumentDropzone from "@/features/workshop/HomebrewDocumentDropzone";
import type { CfMappedDraft } from "@/lib/workshop/cfSchemaMapper";
import { createNewKindToMapped } from "@/lib/workshop/cfSchemaMapper";

type HubAction = {
  kind: CreateNewKind;
  label: string;
  hint: string;
  href?: string;
};

const ACTIONS: HubAction[] = [
  {
    kind: "realm",
    label: "Realm",
    hint: "World or region notes",
    href: "/?mode=realm",
  },
  {
    kind: "npc",
    label: "NPC",
    hint: "Named cast member",
    href: "/library?quickCreate=npc",
  },
  {
    kind: "item",
    label: "Item",
    hint: "Equipment or magic item",
    href: "/items",
  },
  {
    kind: "spell",
    label: "Spell",
    hint: "Homebrew spell notes (Library rules shelf)",
    href: "/library",
  },
  {
    kind: "character",
    label: "Hero",
    hint: "Player character sheet",
    href: "/tavern",
  },
  {
    kind: "location",
    label: "Location",
    hint: "Town, dungeon, or landmark",
    href: "/library?quickCreate=location",
  },
  {
    kind: "quest",
    label: "Adventure",
    hint: "Quest or session outline",
    href: "/?mode=adventure",
  },
  {
    kind: "party",
    label: "Party",
    hint: "Roster of heroes",
    href: "/tavern",
  },
  {
    kind: "campaign",
    label: "Campaign",
    hint: "Campaign builder container",
    href: "/campaigns",
  },
];

export default function CreateNewHubForm({
  initialKind,
  homebrewPreferred = true,
  onClose,
  onHomebrewChange,
}: {
  initialKind?: CreateNewKind | null;
  homebrewPreferred?: boolean;
  onClose: () => void;
  onHomebrewChange?: (value: boolean) => void;
}) {
  const router = useRouter();
  const power = usePowerWorkspaceOptional();
  const [homebrew, setHomebrew] = useState(homebrewPreferred);
  const [selected, setSelected] = useState<CreateNewKind | null>(initialKind ?? null);

  const dropTarget =
    (selected && createNewKindToMapped(selected)) ||
    createNewKindToMapped(initialKind ?? "item") ||
    "item";

  const run = (action: HubAction) => {
    onClose();
    power?.dispatch({ type: "CLOSE_CREATE_HUB" });
    if (action.href) {
      const url =
        homebrew && action.href.includes("?")
          ? `${action.href}&homebrew=1`
          : homebrew
            ? `${action.href}${action.href.includes("?") ? "&" : "?"}homebrew=1`
            : action.href;
      router.push(url);
    }
  };

  const onHomebrewMapped = (mapped: CfMappedDraft) => {
    try {
      sessionStorage.setItem(
        "ddeasy-homebrew-cf-draft",
        JSON.stringify({ mapped, at: Date.now() }),
      );
    } catch {
      /* ignore quota */
    }
    const hrefByKind: Partial<Record<CfMappedDraft["cfKind"], string>> = {
      item: "/items?homebrewDraft=1",
      character: "/tavern?homebrewDraft=1",
      npc: "/library?quickCreate=npc&homebrewDraft=1",
      location: "/library?quickCreate=location&homebrewDraft=1",
      spell: "/library?homebrewDraft=1",
      realm: "/?mode=realm&homebrewDraft=1",
    };
    onClose();
    power?.dispatch({ type: "CLOSE_CREATE_HUB" });
    router.push(hrefByKind[mapped.cfKind] ?? "/library");
  };

  return (
    <div className="create-new-hub-form">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="create-new-hub-title" className="text-lg font-bold text-[var(--text)]">
            Create New…
          </h2>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            Pick a Creation File type. It opens on the center canvas and saves to The Library.
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close">
          Close
        </button>
      </div>

      <label
        className="mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <input
          type="checkbox"
          checked={homebrew}
          onChange={(e) => {
            setHomebrew(e.target.checked);
            onHomebrewChange?.(e.target.checked);
            power?.dispatch({ type: "SET_HOMEBREW_PREFERRED", value: e.target.checked });
          }}
        />
        <span>
          <span className="font-semibold text-[var(--text)]">Add Homebrew Content</span>
          <span className="block text-xs text-[var(--text-soft)]">
            Prefer your own notes over free official rules when both exist.
          </span>
        </span>
      </label>

      {homebrew ? (
        <HomebrewDocumentDropzone
          className="mt-4"
          compact
          targetKind={dropTarget}
          onMapped={onHomebrewMapped}
        />
      ) : null}

      <ul className="mt-4 grid grid-cols-1 gap-2">
        {ACTIONS.map((action) => {
          const isSelected = selected === action.kind;
          return (
            <li key={action.kind}>
              <button
                type="button"
                className="flex w-full flex-col items-start rounded-md border px-3 py-2 text-left transition"
                style={{
                  borderColor: isSelected ? "var(--accent)" : "var(--border)",
                  background: isSelected ? "var(--accent-dim)" : "var(--bg)",
                }}
                onClick={() => {
                  setSelected(action.kind);
                  run(action);
                }}
              >
                <span className="font-semibold text-[var(--text)]">{action.label}</span>
                <span className="text-xs text-[var(--text-soft)]">{action.hint}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
