import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validTripInput } from "@/__test__/fixtures";

const enqueueTripGeneration = vi.hoisted(() => vi.fn());
const getCurrentUser = vi.hoisted(() => vi.fn());
const getTripById = vi.hoisted(() => vi.fn());
const regenerateTrip = vi.hoisted(() => vi.fn());
const tripUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/db/trip.repository", () => ({
  getTripById,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trip: {
      update: tripUpdate,
    },
  },
}));

vi.mock("@/lib/queue/enqueue", () => ({
  enqueueTripGeneration,
}));

vi.mock("@/lib/services/trip.service", () => ({
  regenerateTrip,
}));

vi.mock("@/lib/services/ai-generation.service", () => ({
  AIRateLimitError: class AIRateLimitError extends Error {},
  AIValidationError: class AIValidationError extends Error {},
}));

describe("POST /api/trips/[id]/regenerate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("TRIP_REDIS_STORAGE_REDIS_URL", "redis://redis.example:6379");
    vi.stubEnv("REDIS_URL", "");

    getCurrentUser.mockResolvedValue({ id: "user-1" });
    getTripById.mockResolvedValue({
      id: "trip-1",
      destination: validTripInput.destination,
      startDate: new Date(validTripInput.startDate),
      endDate: new Date(validTripInput.endDate),
      days: [],
      peopleCount: validTripInput.peopleCount,
      tripType: validTripInput.tripType,
    });
    tripUpdate.mockResolvedValue({ id: "trip-1" });
    enqueueTripGeneration.mockResolvedValue("job-1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enqueues regeneration when the trip Redis storage URL is configured", async () => {
    const { POST } = await import("../route");
    const request = new Request("http://localhost/api/trips/trip-1/regenerate", {
      method: "POST",
      body: JSON.stringify({ input: validTripInput }),
    }) as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ id: "trip-1" }),
    });

    await expect(response.json()).resolves.toEqual({
      jobId: "job-1",
      async: true,
    });
    expect(response.status).toBe(202);
    expect(enqueueTripGeneration).toHaveBeenCalledWith(
      "trip-1",
      "user-1",
      validTripInput,
      { bypassCache: true }
    );
    expect(regenerateTrip).not.toHaveBeenCalled();
  });
});
