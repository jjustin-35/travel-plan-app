import { getRedisConnection } from "@/lib/queue/queue";
import { buildCacheKey } from "@/lib/cache-key";
import { TripResponse } from "@/lib/schemas/trip.schema";

const CACHE_TTL_SECONDS = 600; // 10 minutes

export { buildCacheKey };

export async function getCachedTrip(key: string): Promise<TripResponse | null> {
  const redis = getRedisConnection();
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TripResponse;
  } catch {
    return null;
  }
}

export async function setCachedTrip(
  key: string,
  result: TripResponse
): Promise<void> {
  const redis = getRedisConnection();
  await redis.set(key, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
}
