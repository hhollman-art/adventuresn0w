import { MemorySessionStore } from "@/lib/session-room/store/memorySessionStore";
import {
  hasRedisSessionEnv,
  RedisSessionStore,
  redisConfigFromEnv,
} from "@/lib/session-room/store/redisSessionStore";
import type { SessionStore } from "@/lib/session-room/store/types";

export type { SessionStore } from "@/lib/session-room/store/types";
export {
  SESSION_ROOM_TTL_MS,
  SESSION_ROOM_TTL_SECONDS,
  sessionRoomRedisKey,
  isSessionRoomExpired,
  ttlSecondsForRoom,
} from "@/lib/session-room/store/types";
export { MemorySessionStore } from "@/lib/session-room/store/memorySessionStore";
export {
  RedisSessionStore,
  hasRedisSessionEnv,
  redisConfigFromEnv,
} from "@/lib/session-room/store/redisSessionStore";

let singleton: SessionStore | null = null;

/**
 * Build a SessionStore from env:
 * - Redis when `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or Upstash aliases) are set
 * - otherwise in-memory (local / CI)
 */
export function createSessionStore(
  env: NodeJS.ProcessEnv = process.env,
): SessionStore {
  const redisConfig = redisConfigFromEnv(env);
  if (redisConfig && hasRedisSessionEnv(env)) {
    return new RedisSessionStore(redisConfig);
  }
  return new MemorySessionStore();
}

/** Process singleton — one store adapter per serverless isolate. */
export function getSessionStore(): SessionStore {
  if (!singleton) {
    singleton = createSessionStore();
  }
  return singleton;
}

/** Test-only: force a fresh memory store. */
export function __resetSessionStoreForTests(): void {
  const memory = new MemorySessionStore();
  singleton = memory;
}
