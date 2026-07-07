/** Crockford-style alphabet — avoids 0/O and 1/I/L confusion on tablets. */
const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const ROOM_CODE_MIN_LEN = 4;
export const ROOM_CODE_MAX_LEN = 6;
export const ROOM_CODE_DEFAULT_LEN = 5;

/** Normalize user input: uppercase, strip separators. */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** True when code matches allowed length and charset. */
export function isValidRoomCodeFormat(code: string): boolean {
  const normalized = normalizeRoomCode(code);
  if (normalized.length < ROOM_CODE_MIN_LEN || normalized.length > ROOM_CODE_MAX_LEN) {
    return false;
  }
  return [...normalized].every((ch) => ROOM_CODE_CHARS.includes(ch));
}

/** Generate a human-friendly room code for display on the DM dashboard. */
export function generateRoomCode(length = ROOM_CODE_DEFAULT_LEN): string {
  const size = Math.min(ROOM_CODE_MAX_LEN, Math.max(ROOM_CODE_MIN_LEN, length));
  let code = "";
  for (let i = 0; i < size; i += 1) {
    const idx = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[idx];
  }
  return code;
}
