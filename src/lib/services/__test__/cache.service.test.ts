import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCacheKey,
  getCachedTrip,
  setCachedTrip,
} from "@/lib/services/cache.service";
import { validTripInput, validTripResponse } from "@/__test__/fixtures";

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("@/lib/queue/queue", () => ({
  getRedisConnection: () => mockRedis,
}));

describe("cache.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildCacheKey", () => {
    it("returns stable key for same input", () => {
      const key1 = buildCacheKey("user-1", validTripInput);
      const key2 = buildCacheKey("user-1", validTripInput);
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^trip:user-1:[a-f0-9]{16}$/);
    });

    it("normalizes destination casing and whitespace", () => {
      const key1 = buildCacheKey("user-1", validTripInput);
      const key2 = buildCacheKey("user-1", {
        ...validTripInput,
        destination: "  東京  ",
      });
      expect(key1).toBe(key2);
    });

    it("produces different keys for different users", () => {
      const key1 = buildCacheKey("user-1", validTripInput);
      const key2 = buildCacheKey("user-2", validTripInput);
      expect(key1).not.toBe(key2);
    });

    it("produces different keys when trip type changes", () => {
      const key1 = buildCacheKey("user-1", validTripInput);
      const key2 = buildCacheKey("user-1", {
        ...validTripInput,
        tripType: "跟團",
      });
      expect(key1).not.toBe(key2);
    });

    it("produces different keys when trip duration changes", () => {
      const key1 = buildCacheKey("user-1", validTripInput);
      const key2 = buildCacheKey("user-1", {
        ...validTripInput,
        days: validTripInput.days + 1,
      });
      const key3 = buildCacheKey("user-1", {
        ...validTripInput,
        nights: validTripInput.nights + 1,
      });

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe("getCachedTrip", () => {
    it("returns parsed trip when cache hit", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(validTripResponse));
      const result = await getCachedTrip("trip:user-1:abc");
      expect(result).toEqual(validTripResponse);
      expect(mockRedis.get).toHaveBeenCalledWith("trip:user-1:abc");
    });

    it("returns null when cache miss", async () => {
      mockRedis.get.mockResolvedValue(null);
      expect(await getCachedTrip("missing")).toBeNull();
    });

    it("returns null when cached value is invalid JSON", async () => {
      mockRedis.get.mockResolvedValue("not-json");
      expect(await getCachedTrip("bad")).toBeNull();
    });
  });

  describe("setCachedTrip", () => {
    it("stores trip with TTL", async () => {
      await setCachedTrip("trip:user-1:abc", validTripResponse);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "trip:user-1:abc",
        JSON.stringify(validTripResponse),
        "EX",
        600
      );
    });
  });
});
