import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureUserExists, updateTripEvents } from "@/lib/db/trip.repository";
import { prisma } from "@/lib/db/prisma";
import { uiTripEvent } from "@/__test__/fixtures";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      upsert: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe("trip.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions a missing public user row", async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: "user-1",
      name: null,
      avatarUrl: null,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    });

    await ensureUserExists("user-1");

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-1" },
      update: {},
      create: { id: "user-1" },
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
