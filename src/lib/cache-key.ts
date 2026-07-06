import { createHash } from "crypto";

export type CacheKeyInput = {
  destination: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
  tripType: string;
  budgetRange?: string;
  preferredStyles?: string[];
  specialRequirements?: string;
};

export function buildCacheKey(userId: string, input: CacheKeyInput): string {
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
