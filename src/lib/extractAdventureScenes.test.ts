import { describe, expect, it } from "vitest";
import { extractAdventureScenes } from "@/lib/extractAdventureScenes";

const SAMPLE = `
## Locations / scenes

### Gate fight
Something with enough text in the body that passes the minimum length for extraction. The party enters here and finds trouble waiting.

### Inner hall
Another scene with sufficient detail in the narrative that the parser keeps it as a valid scene for maps and props.
`;

describe("extractAdventureScenes", () => {
  it("pulls ### scenes under locations", () => {
    const scenes = extractAdventureScenes(SAMPLE, 5);
    expect(scenes.map((s) => s.title)).toEqual(["Gate fight", "Inner hall"]);
  });
});
