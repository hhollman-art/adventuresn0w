import type { SessionRoom } from "@/lib/session-room/types";
import {
  isSessionRoomExpired,
  type SessionStore,
} from "@/lib/session-room/store/types";

/**
 * Process-local SessionStore for offline / local development.
 * Not safe across serverless replicas — production should use RedisSessionStore.
 */
export class MemorySessionStore implements SessionStore {
  private readonly rooms = new Map<string, SessionRoom>();

  private key(code: string): string {
    return code.trim().toUpperCase();
  }

  async getRoom(code: string): Promise<SessionRoom | null> {
    const key = this.key(code);
    const room = this.rooms.get(key);
    if (!room) return null;
    if (isSessionRoomExpired(room)) {
      this.rooms.delete(key);
      return null;
    }
    // Return a shallow clone so callers cannot mutate the map entry in place.
    return structuredClone(room);
  }

  async setRoom(code: string, data: SessionRoom): Promise<void> {
    const key = this.key(code);
    this.rooms.set(key, structuredClone({ ...data, code: key }));
  }

  async updateRoom(
    code: string,
    partialData: Partial<SessionRoom>,
  ): Promise<SessionRoom | null> {
    const existing = await this.getRoom(code);
    if (!existing) return null;
    const next: SessionRoom = {
      ...existing,
      ...partialData,
      code: existing.code,
      id: partialData.id ?? existing.id,
    };
    await this.setRoom(existing.code, next);
    return structuredClone(next);
  }

  async deleteRoom(code: string): Promise<void> {
    this.rooms.delete(this.key(code));
  }

  /** Test helper — wipe all rooms. */
  clear(): void {
    this.rooms.clear();
  }
}
