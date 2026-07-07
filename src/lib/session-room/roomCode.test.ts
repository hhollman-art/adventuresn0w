import { describe, expect, it } from "vitest";
import {
  generateRoomCode,
  isValidRoomCodeFormat,
  normalizeRoomCode,
  ROOM_CODE_DEFAULT_LEN,
} from "./roomCode";

describe("roomCode", () => {
  it("generates codes within default length and charset", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_DEFAULT_LEN);
    expect(isValidRoomCodeFormat(code)).toBe(true);
  });

  it("normalizes user input", () => {
    expect(normalizeRoomCode(" k7-m3 ")).toBe("K7M3");
  });

  it("rejects ambiguous or short codes", () => {
    expect(isValidRoomCodeFormat("IO1")).toBe(false);
    expect(isValidRoomCodeFormat("AB")).toBe(false);
  });
});
