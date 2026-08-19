"use client";

import type { ReactNode } from "react";
import ContextMenu, { type ContextMenuItem } from "@/features/ui/ContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import {
  libraryEntryToContextTarget,
  parkCfFromContext,
  sendCfToActiveCampaign,
  type CfContextTarget,
} from "@/lib/workshop/cfContextActions";
import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import { emitAppToast } from "@/lib/ui/appToast";

type CfContextMenuProps = {
  target: CfContextTarget;
  onInspect: () => void;
  onQuickEdit?: () => void;
  onDelete?: () => void;
  extraItems?: ContextMenuItem[];
  alreadyParked?: boolean;
  children: (bind: ReturnType<typeof useContextMenu>["bind"]) => ReactNode;
};

/** Wraps a Creation File / SRD card with the standard DM context menu. */
export default function CfContextMenu({
  target,
  onInspect,
  onQuickEdit,
  onDelete,
  extraItems = [],
  alreadyParked = false,
  children,
}: CfContextMenuProps) {
  const menu = useContextMenu();
  const canEdit = Boolean(onQuickEdit) && target.provenance !== "srd";
  const canDelete = Boolean(onDelete) && target.provenance !== "srd";

  const items: ContextMenuItem[] = [
    {
      id: "campaign",
      label: "Send to Active Campaign",
      onSelect: () => sendCfToActiveCampaign(target),
    },
    {
      id: "park",
      label: alreadyParked ? "Already in Lore Vault" : "Park in Lore Vault",
      disabled: alreadyParked,
      onSelect: () => parkCfFromContext(target),
    },
    {
      id: "inspect",
      label: "Inspect Details (Scrying Glass)",
      onSelect: onInspect,
    },
    {
      id: "edit",
      label: "Quick Edit",
      disabled: !canEdit,
      onSelect: () => {
        if (!onQuickEdit) {
          emitAppToast("This card is read-only here — inspect it to copy or revise.", "info");
          return;
        }
        onQuickEdit();
      },
    },
    ...extraItems,
    {
      id: "delete",
      label: "Delete / Purge",
      danger: true,
      hidden: !canDelete,
      onSelect: () => onDelete?.(),
    },
  ];

  return (
    <>
      {children(menu.bind)}
      <ContextMenu
        open={menu.open}
        x={menu.position?.x ?? 0}
        y={menu.position?.y ?? 0}
        label={`Actions for ${target.title}`}
        items={items}
        onClose={menu.close}
      />
    </>
  );
}

export function CfContextMenuForLibraryEntry({
  entry,
  ...rest
}: Omit<CfContextMenuProps, "target"> & { entry: LibraryListEntry }) {
  return <CfContextMenu target={libraryEntryToContextTarget(entry)} {...rest} />;
}
