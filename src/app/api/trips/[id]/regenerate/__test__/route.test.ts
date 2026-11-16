import { beforeEach, describe, expect, it, vi } from "vitest";

import { validTripInput } from "@/__test__/fixtures";

const getCurrentUser = vi.fn();
const getTripById = vi.fn();
const getLatestTripGenerationInput = vi.fn();
const tripUpdate = vi.fn();
const enqueueTripGeneration = vi.fn();

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

vi.mock("@/lib/db/trip.repository", () => ({
  getTripById: (...args: unknown[]) => getTripById(...args),
  getLatestTripGenerationInput: (...args: unknown[]) =>
    getLatestTripGenerationInput(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trip: {
      update: (...args: unknown[]) => tripUpdate(...args),
    },
  },
}));

vi.mock("@/lib/queue/enqueue", () => ({
  enqueueTripGeneration: (...args: unknown[]) =>
    enqueueTripGeneration(...args),
}));

describe("POST /api/trips/[id]/regenerate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.REDIS_URL;
    process.env.TRIP_REDIS_STORAGE_REDIS_URL = "rediss://redis.example.com:6379";

    getCurrentUser.mockResolvedValue({ id: "user-1" });
    getTripById.mockResolvedValue({
      id: "trip-1",
      destination: "京都",
      startDate: new Date("2026-04-10T00:00:00.000Z"),
      endDate: new Date("2026-04-12T00:00:00.000Z"),
      days: [{ id: "day-1" }, { id: "day-2" }, { id: "day-3" }],
      peopleCount: 4,
      tripType: "家庭旅遊",
    });
    getLatestTripGenerationInput.mockResolvedValue({
      ...validTripInput,
      destination: "東京",
      startDate: "2026-04-01",
      endDate: "2026-04-05",
      days: 5,
      nights: 4,
      peopleCount: 2,
      tripType: "自由行",
    });
    tripUpdate.mockResolvedValue({});
    enqueueTripGeneration.mockResolvedValue("job-1");
  });

  it("uses the Redis Cloud env var and preserves saved optional preferences", async () => {
    const { POST } = await import("../route");

    const response = await POST(
      new Request("http://localhost/api/trips/trip-1/regenerate", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "trip-1" }) }
    );

    await expect(response.json()).resolves.toEqual({
      jobId: "job-1",
      async: true,
    });
    expect(response.status).toBe(202);
    expect(enqueueTripGeneration).toHaveBeenCalledWith(
      "trip-1",
      "user-1",
      {
        destination: "京都",
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        days: 3,
        nights: 2,
        peopleCount: 4,
        tripType: "家庭旅遊",
        budgetRange: "中等",
        preferredStyles: ["美食", "文化"],
        specialRequirements: "素食友善",
      },
      { bypassCache: true }
    );
  });
});
