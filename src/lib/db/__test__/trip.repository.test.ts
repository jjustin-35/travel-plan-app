import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateTripEvents } from "@/lib/db/trip.repository";
import { prisma } from "@/lib/db/prisma";
import { uiTripEvent } from "@/__test__/fixtures";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma);

describe("trip.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

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
});
