import { describe, expect, it, vi } from "vitest";

import {
  generateWorkerTrip,
  persistGeneratedTripResult,
} from "@/lib/worker/trip-generation";
import { TripInput, TripResponse } from "@/lib/schemas/trip.schema";

const input: TripInput = {
  destination: "東京",
  startDate: "2026-04-01",
  endDate: "2026-04-02",
  days: 2,
  nights: 1,
  peopleCount: 2,
  tripType: "休閒",
};

const aiResult: TripResponse = {
  trip: {
    title: "東京二日遊",
    days: [
      {
        day: 1,
        date: "2026-04-01",
        events: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            title: "淺草散策",
            location: "淺草寺",
            description: "參觀經典景點",
            category: "景點",
            event_time: "09:00",
            duration_minutes: 90,
            sort_order: 1,
            lat: 35.7148,
            lng: 139.7967,
          },
        ],
      },
    ],
  },
};

describe("worker trip generation", () => {
  it("retries malformed JSON responses before failing the job", async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce({ text: "{" })
      .mockResolvedValueOnce({ text: JSON.stringify(aiResult) });

    await expect(
      generateWorkerTrip(input, {
        generateContent,
        model: "test-model",
        timeoutMs: 1000,
      })
    ).resolves.toEqual(aiResult);

    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("rejects stalled model calls so worker jobs can fail instead of hanging", async () => {
    await expect(
      generateWorkerTrip(input, {
        generateContent: () => new Promise(() => undefined),
        model: "test-model",
        timeoutMs: 1,
      })
    ).rejects.toThrow("AI generation timed out");
  });
});

describe("persistGeneratedTripResult", () => {
  it("writes cache only after the generated trip is persisted", async () => {
    const calls: string[] = [];
    const saveTripResult = vi.fn(async () => {
      calls.push("persist");
    });
    const cacheWriter = {
      set: vi.fn(async () => {
        calls.push("cache");
      }),
    };

    await persistGeneratedTripResult({
      cacheKey: "trip:user:key",
      aiResult,
      cacheWriter,
      saveTripResult,
    });

    expect(calls).toEqual(["persist", "cache"]);
  });

  it("does not cache a result that failed to persist", async () => {
    const saveTripResult = vi.fn(async () => {
      throw new Error("insert failed");
    });
    const cacheWriter = {
      set: vi.fn(async () => undefined),
    };

    await expect(
      persistGeneratedTripResult({
        cacheKey: "trip:user:key",
        aiResult,
        cacheWriter,
        saveTripResult,
      })
    ).rejects.toThrow("insert failed");

    expect(cacheWriter.set).not.toHaveBeenCalled();
  });

  it("keeps persisted trips successful when Redis cache writes fail", async () => {
    const saveTripResult = vi.fn(async () => undefined);
    const cacheError = new Error("redis down");
    const onCacheError = vi.fn();
    const cacheWriter = {
      set: vi.fn(async () => {
        throw cacheError;
      }),
    };

    await expect(
      persistGeneratedTripResult({
        cacheKey: "trip:user:key",
        aiResult,
        cacheWriter,
        saveTripResult,
        onCacheError,
      })
    ).resolves.toBeUndefined();

    expect(saveTripResult).toHaveBeenCalledOnce();
    expect(onCacheError).toHaveBeenCalledWith(cacheError);
  });
});
