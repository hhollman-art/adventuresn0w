import { describe, expect, it } from "vitest";
import { coverCropRect } from "./mapImage";

describe("coverCropRect", () => {
  it("crops wider sources on the sides", () => {
    const crop = coverCropRect(2000, 1000, 700, 700);
    expect(crop.sh).toBe(1000);
    expect(crop.sw).toBe(1000);
    expect(crop.sx).toBe(500);
    expect(crop.sy).toBe(0);
  });

  it("crops taller sources on the top and bottom", () => {
    const crop = coverCropRect(1000, 2000, 700, 700);
    expect(crop.sw).toBe(1000);
    expect(crop.sh).toBe(1000);
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBe(500);
  });
});
