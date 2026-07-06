import { describe, expect, it } from "vitest";
import {
  WORKSHOP_NAV_GROUPS,
  WORKSHOP_NAV_ITEMS,
  activeWorkshopNavId,
  workshopNavItem,
} from "./workshopNav";

describe("workshopNav", () => {
  it("includes welcome and forge creation workspaces (no item handouts nav)", () => {
    const ids = WORKSHOP_NAV_ITEMS.map((item) => item.id);
    expect(ids).toContain("welcome");
    expect(ids).toContain("campaigns");
    expect(ids).toContain("realm");
    expect(ids).toContain("adventure");
    expect(ids).toContain("maps");
    expect(ids).toContain("tavern");
    expect(ids).toContain("items");
    expect(ids).not.toContain("props");
    expect(ids).not.toContain("characters");
    expect(ids).not.toContain("parties");
  });

  it("lists The Library before Campaign in the workspace menu", () => {
    expect(WORKSHOP_NAV_GROUPS[1]).toBe("library");
    expect(WORKSHOP_NAV_GROUPS[2]).toBe("campaign");
    const afterWelcome = WORKSHOP_NAV_ITEMS.filter((item) => item.id !== "welcome");
    expect(afterWelcome[0]?.id).toBe("library");
    expect(afterWelcome[1]?.id).toBe("campaigns");
    expect(workshopNavItem("library")?.label).toBe("The Library");
    expect(workshopNavItem("campaigns")?.label).toBe("Campaign");
    expect(workshopNavItem("tavern")?.label).toBe("The Tavern");
    expect(workshopNavItem("items")?.label).toBe("Items");
  });

  it("resolves active nav from pathname and workspace", () => {
    expect(activeWorkshopNavId({ pathname: "/", workspace: "welcome" })).toBe("welcome");
    expect(activeWorkshopNavId({ pathname: "/", workspace: "realm" })).toBe("realm");
    expect(activeWorkshopNavId({ pathname: "/", workspace: "characters" })).toBe("tavern");
    expect(activeWorkshopNavId({ pathname: "/library", workspace: "welcome" })).toBe("library");
    expect(activeWorkshopNavId({ pathname: "/tavern", workspace: "welcome" })).toBe("tavern");
    expect(activeWorkshopNavId({ pathname: "/parties", workspace: "welcome" })).toBe("tavern");
    expect(activeWorkshopNavId({ pathname: "/items", workspace: "welcome" })).toBe("items");
    expect(activeWorkshopNavId({ pathname: "/campaigns", workspace: "welcome" })).toBe(
      "campaigns",
    );
    expect(activeWorkshopNavId({ pathname: "/table", workspace: "welcome" })).toBeNull();
  });

  it("looks up nav items by id", () => {
    expect(workshopNavItem("maps")?.creation).toBe("maps");
    expect(workshopNavItem("library")?.href).toBe("/library");
    expect(workshopNavItem("tavern")?.href).toBe("/tavern");
  });
});
