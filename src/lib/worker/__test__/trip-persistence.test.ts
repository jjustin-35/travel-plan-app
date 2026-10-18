import { beforeEach, describe, expect, it, vi } from "vitest";

import { validTripResponse } from "@/__test__/fixtures";
import { prisma } from "@/lib/db/prisma";
import {
  markTripGenerationFailed,
  saveTripResult,
  tripExists,
} from "@/lib/worker/trip-persistence";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    trip: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    aIGenerationJob: {
      updateMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe("trip-persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks whether a trip still exists before processing a worker job", async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ id: "trip-1" });

    await expect(tripExists("trip-1")).resolves.toBe(true);
    expect(mockPrisma.trip.findUnique).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      select: { id: true },
    });

    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(tripExists("trip-1")).resolves.toBe(false);
  });

  it("skips persisting generated days when the trip was deleted", async () => {
    const tx = {
      trip: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      tripDay: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      tripEvent: {
        createMany: vi.fn(),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const saved = await saveTripResult("trip-1", validTripResponse);

    expect(saved).toBe(false);
    expect(tx.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: {
        title: validTripResponse.trip.title,
        status: "ready",
        version: { increment: 1 },
      },
    });
    expect(tx.tripDay.deleteMany).not.toHaveBeenCalled();
    expect(tx.tripDay.create).not.toHaveBeenCalled();
    expect(tx.tripEvent.createMany).not.toHaveBeenCalled();
  });

  it("persists generated days only after claiming an existing trip row", async () => {
    const tx = {
      trip: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      tripDay: {
        deleteMany: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: "day-1" }),
      },
      tripEvent: {
        createMany: vi.fn(),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const saved = await saveTripResult("trip-1", validTripResponse);

    expect(saved).toBe(true);
    expect(tx.tripDay.deleteMany).toHaveBeenCalledWith({
      where: { tripId: "trip-1" },
    });
    expect(tx.tripDay.create).toHaveBeenCalledWith({
      data: {
        tripId: "trip-1",
        dayNumber: 1,
        date: new Date("2026-04-01"),
      },
    });
    expect(tx.tripEvent.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: validTripResponse.trip.days[0].events[0].id,
          tripDayId: "day-1",
          title: validTripResponse.trip.days[0].events[0].title,
          location: validTripResponse.trip.days[0].events[0].location,
          description: validTripResponse.trip.days[0].events[0].description,
          category: validTripResponse.trip.days[0].events[0].category,
          eventTime: validTripResponse.trip.days[0].events[0].event_time,
          durationMinutes:
            validTripResponse.trip.days[0].events[0].duration_minutes,
          sortOrder: validTripResponse.trip.days[0].events[0].sort_order,
          lat: validTripResponse.trip.days[0].events[0].lat,
          lng: validTripResponse.trip.days[0].events[0].lng,
        },
      ],
    });
  });

  it("marks failed generation with updateMany so deleted trips do not throw", async () => {
    mockPrisma.trip.updateMany.mockReturnValue(
      Promise.resolve({ count: 0 }) as never
    );
    mockPrisma.aIGenerationJob.updateMany.mockReturnValue(
      Promise.resolve({ count: 0 }) as never
    );
    mockPrisma.$transaction.mockResolvedValue([{ count: 0 }, { count: 0 }]);

    await markTripGenerationFailed("trip-1", "AI failed");

    expect(mockPrisma.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { status: "failed" },
    });
    expect(mockPrisma.aIGenerationJob.updateMany).toHaveBeenCalledWith({
      where: { tripId: "trip-1", status: "processing" },
      data: { status: "failed", errorMessage: "AI failed" },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
