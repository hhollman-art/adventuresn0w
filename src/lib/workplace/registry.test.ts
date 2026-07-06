import { describe, expect, it } from "vitest";
import { WORKPLACES, workplace, workplaceForRoute } from "./registry";

describe("workplace registry", () => {
  it("registers items workplace with user and SRD item classes", () => {
    const items = workplace("items");
    expect(items.route).toBe("/items");
    expect(items.ciClasses).toContain("item.equipment");
    expect(items.ciClasses).toContain("item.srd-equipment");
    expect(items.ciClasses).toContain("item.srd-magic");
    expect(items.libraryCategory).toBe("items");
  });

  it("maps routes to workplaces", () => {
    expect(workplaceForRoute("/items")?.id).toBe("items");
    expect(workplaceForRoute("/library")?.id).toBe("library");
    expect(workplaceForRoute("/campaigns")?.id).toBe("campaigns");
    expect(workplaceForRoute("/tavern")?.id).toBe("tavern");
    expect(workplaceForRoute("/parties")?.id).toBe("tavern");
  });

  it("includes SRD item classes in the library workplace", () => {
    expect(WORKPLACES.library.ciClasses).toContain("item.srd-equipment");
  });
});
