import { Redis } from "@upstash/redis";
import type { SessionRoom } from "@/lib/session-room/types";
import {
  isSessionRoomExpired,
  sessionRoomRedisKey,
  ttlSecondsForRoom,
  type SessionStore,
} from "@/lib/session-room/store/types";

export type RedisSessionStoreConfig = {
  url: string;
  token: string;
};

export type SessionStoreEnv = Record<string, string | undefined>;

/**
 * Upstash Redis (HTTP) SessionStore — works on Vercel / Lambda without sticky sessions.
 * Keys expire via Redis TTL aligned to each room's `expiresAt`.
 */
export class RedisSessionStore implements SessionStore {
  private readonly redis: Redis;

  constructor(config: RedisSessionStoreConfig) {
    this.redis = new Redis({ url: config.url, token: config.token });
  }

  async getRoom(code: string): Promise<SessionRoom | null> {
    const key = sessionRoomRedisKey(code);
    const raw = await this.redis.get<SessionRoom | string>(key);
    if (raw == null) return null;

    const room = typeof raw === "string" ? (JSON.parse(raw) as SessionRoom) : raw;
    if (!room || typeof room !== "object" || typeof room.code !== "string") {
      await this.redis.del(key);
      return null;
    }
    if (isSessionRoomExpired(room)) {
      await this.redis.del(key);
      return null;
    }
    return room;
  }

  async setRoom(code: string, data: SessionRoom): Promise<void> {
    const normalized = code.trim().toUpperCase();
    const room: SessionRoom = { ...data, code: normalized };
    const key = sessionRoomRedisKey(normalized);
    const ex = ttlSecondsForRoom(room);
    await this.redis.set(key, room, { ex });
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
    return next;
  }

  async deleteRoom(code: string): Promise<void> {
    await this.redis.del(sessionRoomRedisKey(code));
  }
}

/** True when Upstash / Vercel KV REST credentials are present. */
export function hasRedisSessionEnv(
  env: SessionStoreEnv = process.env,
): boolean {
  const url = env.KV_REST_API_URL?.trim() || env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    env.KV_REST_API_TOKEN?.trim() || env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(url && token);
}

export function redisConfigFromEnv(
  env: SessionStoreEnv = process.env,
): RedisSessionStoreConfig | null {
  const url = env.KV_REST_API_URL?.trim() || env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    env.KV_REST_API_TOKEN?.trim() || env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}
