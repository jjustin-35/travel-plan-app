import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTripWithDays,
  getLatestTripGenerationInput,
  updateTripEvents,
} from "@/lib/db/trip.repository";
import { prisma } from "@/lib/db/prisma";
import {
  uiTripEvent,
  validTripInput,
  validTripResponse,
} from "@/__test__/fixtures";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    aIGenerationJob: {
      findFirst: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe("trip.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records the generation input when creating a ready trip synchronously", async () => {
    const savedTrip = { id: "trip-1", title: "東京五日遊" };
    const tx = {
      trip: {
        create: vi.fn().mockResolvedValue(savedTrip),
      },
      aIGenerationJob: {
        create: vi.fn(),
      },
      tripDay: {
        create: vi.fn().mockResolvedValue({ id: "day-1" }),
      },
      tripEvent: {
        createMany: vi.fn(),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never)
    );

    const result = await createTripWithDays(
      "user-1",
      validTripInput,
      validTripResponse
    );

    expect(result).toBe(savedTrip);
    expect(tx.aIGenerationJob.create).toHaveBeenCalledWith({
      data: {
        tripId: "trip-1",
        userId: "user-1",
        idempotencyKey: expect.any(String),
        status: "done",
        promptInput: validTripInput,
        completedAt: expect.any(Date),
      },
    });
  });

  it("rejects event updates while a trip is regenerating", async () => {
    const tx = {
      trip: {
        findFirst: vi.fn().mockResolvedValue({
          id: "trip-1",
          version: 4,
          status: "generating",
        }),
        update: vi.fn(),
      },
      tripDay: {
        findMany: vi.fn(),
      },
      tripEvent: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never)
    );

    const result = await updateTripEvents(
      "trip-1",
      "user-1",
      4,
      "2026-04-01T00:00:00.000Z",
      [{ dayNumber: 1, events: [uiTripEvent] }]
    );

    expect(result).toEqual({ conflict: true, currentVersion: 4 });
    expect(tx.tripDay.findMany).not.toHaveBeenCalled();
    expect(tx.tripEvent.deleteMany).not.toHaveBeenCalled();
    expect(tx.tripEvent.createMany).not.toHaveBeenCalled();
    expect(tx.trip.update).not.toHaveBeenCalled();
  });

  it("returns the latest saved generation input for a trip", async () => {
    vi.mocked(prisma.aIGenerationJob.findFirst).mockResolvedValue({
      promptInput: validTripInput,
    } as never);

    const input = await getLatestTripGenerationInput("trip-1", "user-1");

    expect(input).toEqual(validTripInput);
    expect(prisma.aIGenerationJob.findFirst).toHaveBeenCalledWith({
      where: { tripId: "trip-1", userId: "user-1" },
      orderBy: { createdAt: "desc" },
      select: { promptInput: true },
    });
  });

  it("ignores malformed saved generation input", async () => {
    vi.mocked(prisma.aIGenerationJob.findFirst).mockResolvedValue({
      promptInput: { destination: "東京" },
    } as never);

    await expect(
      getLatestTripGenerationInput("trip-1", "user-1")
    ).resolves.toBeNull();
  });
});
