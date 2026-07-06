import { getRedisConnection } from "@/lib/queue/queue";
import { createHash } from "crypto";
import { TripInput, TripResponse } from "@/lib/schemas/trip.schema";

const CACHE_TTL_SECONDS = 600; // 10 minutes

export function buildCacheKey(userId: string, input: TripInput): string {
  const normalized = {
    destination: input.destination.trim().toLowerCase(),
    startDate: input.startDate,
    endDate: input.endDate,
    peopleCount: input.peopleCount,
    tripType: input.tripType,
    budgetRange: input.budgetRange ?? "",
    preferredStyles: (input.preferredStyles ?? []).sort().join(","),
    specialRequirements: (input.specialRequirements ?? "").trim().toLowerCase(),
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex")
    .slice(0, 16);
  return `trip:${userId}:${hash}`;
}

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
