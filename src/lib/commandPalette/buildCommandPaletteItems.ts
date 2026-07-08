import { autoLinkToActiveCampaign } from "@/lib/campaigns";
import { queuePendingLibrarySelection } from "@/lib/commandPalette/commandPaletteEvents";
import type { CommandPaletteItem } from "@/lib/commandPalette/commandPaletteRegistry";
import { saveNpc } from "@/lib/worldAssets/npc";
import { THE_HEARTH, THE_LIBRARY, THE_TAVERN, VIRTUAL_TABLE } from "@/lib/workplace/forgeLexicon";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";

export type CommandPaletteHandlers = {
  router: { push: (href: string) => void };
  openVault: () => void;
};

export function buildCommandPaletteItems(handlers: CommandPaletteHandlers): CommandPaletteItem[] {
  const { router, openVault } = handlers;

  return [
    {
      id: "workspace-live-combat",
      label: "Jump to Live Combat",
      category: "workspaces",
      icon: "\u2694\uFE0F",
      hint: `Open the ${VIRTUAL_TABLE} and initiative tracker`,
      keywords: ["table", "vtt", "initiative", "combat", "battle", "live"],
      run: () => router.push("/table"),
    },
    {
      id: "workspace-campaign-prep",
      label: "Go to Campaign Prep",
      category: "workspaces",
      icon: "\u{1F3C7}",
      hint: "Manage chronicles, linked parties, and adventure CFs",
      keywords: ["campaign", "chronicle", "prep", "planning"],
      run: () => router.push("/campaigns"),
    },
    {
      id: "workspace-lore-vault",
      label: "Open Lore Vault",
      category: "workspaces",
      icon: "\u{1F4DA}",
      hint: "Drag heroes, NPCs, and gear from the sidebar vault",
      keywords: ["vault", "drawer", "lore", "drag", "deploy"],
      run: openVault,
    },
    {
      id: "workspace-hearth",
      label: `Go to ${THE_HEARTH}`,
      category: "workspaces",
      icon: "\u{1F3E0}",
      hint: "Return to the Fantasy Forge welcome dashboard",
      keywords: ["home", "welcome", "dashboard", "forge"],
      run: () => {
        router.push("/");
        dispatchWorkshopWelcome();
      },
    },
    {
      id: "workspace-library",
      label: `Open ${THE_LIBRARY}`,
      category: "workspaces",
      icon: "\u{1F4DA}",
      hint: "Browse every saved CF, SRD entry, and AI output",
      keywords: ["library", "shelf", "browse", "search"],
      run: () => router.push("/library"),
    },
    {
      id: "workspace-encounters",
      label: "Go to Encounter Prep",
      category: "workspaces",
      icon: "\u{1F5E1}\uFE0F",
      hint: "Stage combatants before sending them to the live tracker",
      keywords: ["encounter", "prep", "monsters", "initiative"],
      run: () => router.push("/encounters"),
    },
    {
      id: "workspace-tavern",
      label: `Open ${THE_TAVERN}`,
      category: "workspaces",
      icon: "\u{1F37A}",
      hint: "Heroes, parties, and character sheets",
      keywords: ["tavern", "characters", "party", "heroes"],
      run: () => router.push("/tavern"),
    },
    {
      id: "create-npc",
      label: "Create New NPC",
      category: "quick-creation",
      icon: "\u{1F9D9}",
      hint: "Add a named NPC CF to your Library",
      keywords: ["npc", "villain", "character", "new", "create"],
      run: async () => {
        const name = window.prompt("What is this NPC called?");
        if (!name?.trim()) return;
        const list = await saveNpc({ name: name.trim() });
        const created = list.find((row) => row.name === name.trim()) ?? list[0];
        if (created) {
          void autoLinkToActiveCampaign({ npcId: created.id });
          queuePendingLibrarySelection({ kind: "npc", id: created.id });
        }
        router.push("/library");
      },
    },
    {
      id: "create-encounter",
      label: "Create New Encounter",
      category: "quick-creation",
      icon: "\u{1F5E1}\uFE0F",
      hint: "Open Encounter Prep to stage the next fight",
      keywords: ["encounter", "combat", "fight", "new", "create"],
      run: () => router.push("/encounters"),
    },
    {
      id: "create-item",
      label: "Create New Item",
      category: "quick-creation",
      icon: "\u{1F48E}",
      hint: "Craft equipment or magic item CFs",
      keywords: ["item", "loot", "gear", "magic", "new", "create"],
      run: () => router.push("/items"),
    },
    {
      id: "create-quest",
      label: "Create New Quest",
      category: "quick-creation",
      icon: "\u{1F4DC}",
      hint: "Start a new adventure in the Fantasy Forge",
      keywords: ["quest", "adventure", "story", "new", "create"],
      run: () => router.push("/?mode=adventure"),
    },
  ];
}
