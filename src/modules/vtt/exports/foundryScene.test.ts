import { describe, expect, it } from "vitest";
import { createDefaultSession } from "@/lib/tabletop/session";
import { exportFoundrySceneFromSession } from "./foundryScene";

describe("foundryScene export", () => {
  it("maps grid dimensions and tokens to Foundry scene coordinates", () => {
    const session = createDefaultSession();
    session.mapName = "Crypt Entry";
    session.mapGridCols = 20;
    session.mapGridRows = 15;
    session.grid.cols = 20;
    session.grid.rows = 15;
    session.tokens = [
      {
        id: "t1",
        label: "Thornwick",
        color: "#2563eb",
        kind: "pc",
        x: 4,
        y: 6,
        size: 1,
        hp: { current: 28, max: 28 },
        hidden: false,
        imageDataUrl: null,
      },
    ];

    const bundle = exportFoundrySceneFromSession(session);
    expect(bundle.data.name).toBe("Crypt Entry");
    expect(bundle.data.width).toBe(20 * 70);
    expect(bundle.data.height).toBe(15 * 70);
    expect(bundle.data.grid.distance).toBe(5);
    expect(bundle.data.tokens).toHaveLength(1);
    expect(bundle.data.tokens[0]?.name).toBe("Thornwick");
    expect(bundle.data.tokens[0]?.disposition).toBe(1);
    expect(bundle.importNotes).toContain("Foundry Scene Import");
  });
});
