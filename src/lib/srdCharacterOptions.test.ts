import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARTY_SIZE,
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  addCharacterSlot,
  defaultCharacterSlots,
  emptyCharacterSlot,
  parsePartyCount,
  removeCharacterSlot,
  resizeCharacterSlots,
} from "./srdCharacterOptions";

describe("parsePartyCount", () => {
  it("defaults blank input to four PCs", () => {
    expect(parsePartyCount("")).toBe(DEFAULT_PARTY_SIZE);
    expect(parsePartyCount("   ")).toBe(DEFAULT_PARTY_SIZE);
  });

  it("clamps to the allowed range", () => {
    expect(parsePartyCount("0")).toBe(MIN_PARTY_SIZE);
    expect(parsePartyCount("12")).toBe(MAX_PARTY_SIZE);
  });
});

describe("party member slots", () => {
  it("resizes while preserving existing picks", () => {
    const slots = [{ className: "Fighter", race: "Human" }, emptyCharacterSlot()];
    expect(resizeCharacterSlots(slots, 3)).toEqual([
      { className: "Fighter", race: "Human" },
      emptyCharacterSlot(),
      emptyCharacterSlot(),
    ]);
  });

  it("adds a member up to the maximum", () => {
    let slots = defaultCharacterSlots(MIN_PARTY_SIZE);
    slots = addCharacterSlot(slots);
    expect(slots).toHaveLength(2);
    slots = Array.from({ length: MAX_PARTY_SIZE }, () => emptyCharacterSlot());
    expect(addCharacterSlot(slots)).toHaveLength(MAX_PARTY_SIZE);
  });

  it("removes a member without going below the minimum", () => {
    const slots = defaultCharacterSlots(3);
    expect(removeCharacterSlot(slots, 1)).toHaveLength(2);
    expect(removeCharacterSlot(slots, 1)[0]).toEqual(slots[0]);
    expect(removeCharacterSlot(defaultCharacterSlots(MIN_PARTY_SIZE), 0)).toHaveLength(
      MIN_PARTY_SIZE,
    );
  });
});
