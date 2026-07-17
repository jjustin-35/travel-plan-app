import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateTripEvents } from "@/lib/db/trip.repository";
import { prisma } from "@/lib/db/prisma";

type MockTx = {
  trip: {
    updateMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  tripDay: {
    findMany: ReturnType<typeof vi.fn>;
  };
  tripEvent: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
};

vi.mock("@/lib/db/prisma", () => {
  const tx = {
    trip: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    tripDay: {
      findMany: vi.fn(),
    },
    tripEvent: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };

  return {
    prisma: {
      tx,
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

const tx = (prisma as unknown as { tx: MockTx }).tx;

const event = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Lunch",
  location: "Market",
  description: "Eat",
  category: "food",
  eventTime: "12:00",
  durationMinutes: 60,
  sortOrder: 1,
  lat: 35.1,
  lng: 139.1,
};

describe("updateTripEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.trip.updateMany.mockResolvedValue({ count: 1 });
    tx.trip.findFirst.mockResolvedValue({ id: "trip-1", version: 3 });
    tx.tripDay.findMany.mockResolvedValue([{ id: "day-1", dayNumber: 1 }]);
    tx.tripEvent.deleteMany.mockResolvedValue({ count: 1 });
    tx.tripEvent.createMany.mockResolvedValue({ count: 1 });
  });

  it("claims the expected trip version atomically before replacing events", async () => {
    const result = await updateTripEvents(
      "trip-1",
      "user-1",
      2,
      "2026-04-01T00:00:00.000Z",
      [{ dayNumber: 1, events: [event] }]
    );

    expect(result).toEqual({ conflict: false });
    expect(tx.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "trip-1", userId: "user-1", version: 2 },
      data: { version: { increment: 1 } },
    });
    expect(tx.trip.findFirst).not.toHaveBeenCalled();
    expect(tx.trip.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.tripDay.findMany.mock.invocationCallOrder[0]
    );
    expect(tx.tripEvent.deleteMany).toHaveBeenCalledWith({
      where: { tripDayId: "day-1" },
    });
    expect(tx.tripEvent.createMany).toHaveBeenCalledWith({
      data: [{ ...event, tripDayId: "day-1" }],
    });
  });

  it("returns a conflict when another writer already advanced the version", async () => {
    tx.trip.updateMany.mockResolvedValueOnce({ count: 0 });
    tx.trip.findFirst.mockResolvedValueOnce({ id: "trip-1", version: 3 });

    const result = await updateTripEvents(
      "trip-1",
      "user-1",
      2,
      "2026-04-01T00:00:00.000Z",
      [{ dayNumber: 1, events: [event] }]
    );

    expect(result).toEqual({ conflict: true, currentVersion: 3 });
    expect(tx.tripDay.findMany).not.toHaveBeenCalled();
    expect(tx.tripEvent.deleteMany).not.toHaveBeenCalled();
    expect(tx.tripEvent.createMany).not.toHaveBeenCalled();
  });
});
