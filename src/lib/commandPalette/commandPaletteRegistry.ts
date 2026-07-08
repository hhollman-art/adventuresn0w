export type CommandPaletteCategory = "workspaces" | "quick-creation";

export type CommandPaletteItem = {
  id: string;
  label: string;
  category: CommandPaletteCategory;
  keywords: string[];
  hint?: string;
  icon?: string;
  run: () => void | Promise<void>;
};

export const COMMAND_PALETTE_CATEGORY_LABEL: Record<CommandPaletteCategory, string> = {
  workspaces: "Workspaces",
  "quick-creation": "Quick creation",
};

export function filterCommandPaletteItems(
  items: CommandPaletteItem[],
  query: string,
): CommandPaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const haystack = [
      item.label,
      item.hint ?? "",
      COMMAND_PALETTE_CATEGORY_LABEL[item.category],
      ...item.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export function groupCommandPaletteItems(
  items: CommandPaletteItem[],
): Array<{ category: CommandPaletteCategory; items: CommandPaletteItem[] }> {
  const order: CommandPaletteCategory[] = ["workspaces", "quick-creation"];
  return order
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}
