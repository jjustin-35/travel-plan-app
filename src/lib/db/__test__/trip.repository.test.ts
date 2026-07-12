import { beforeEach, describe, expect, it, vi } from "vitest";
import { uiTripEvent } from "@/__test__/fixtures";
import { updateTripEvents } from "@/lib/db/trip.repository";

const { mockTransaction, tx } = vi.hoisted(() => {
  const tx = {
    trip: {
      findFirst: vi.fn(),
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

  return {
    tx,
    mockTransaction: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mockTransaction,
  },
}));

describe("trip.repository updateTripEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((callback) => callback(tx));
    tx.trip.findFirst.mockResolvedValue({ id: "trip-1", version: 4 });
    tx.tripDay.findMany.mockResolvedValue([{ id: "day-1", dayNumber: 1 }]);
  });

  it("updates events and increments version when the requested day exists", async () => {
    const result = await updateTripEvents(
      "trip-1",
      "user-1",
      4,
      "2026-04-01T00:00:00.000Z",
      [{ dayNumber: 1, events: [uiTripEvent] }]
    );

    expect(result).toEqual({ conflict: false });
    expect(tx.tripEvent.deleteMany).toHaveBeenCalledWith({
      where: { tripDayId: "day-1" },
    });
    expect(tx.tripEvent.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: uiTripEvent.id,
          tripDayId: "day-1",
          title: uiTripEvent.title,
          location: uiTripEvent.location,
          description: uiTripEvent.description,
          category: uiTripEvent.category,
          eventTime: uiTripEvent.eventTime,
          durationMinutes: uiTripEvent.durationMinutes,
          sortOrder: uiTripEvent.sortOrder,
          lat: uiTripEvent.lat,
          lng: uiTripEvent.lng,
        },
      ],
    });
    expect(tx.trip.update).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { version: { increment: 1 } },
    });
  });

  it("reports a conflict without writing when the requested day no longer exists", async () => {
    const result = await updateTripEvents(
      "trip-1",
      "user-1",
      4,
      "2026-04-01T00:00:00.000Z",
      [{ dayNumber: 2, events: [uiTripEvent] }]
    );

    expect(result).toEqual({ conflict: true, currentVersion: 4 });
    expect(tx.tripEvent.deleteMany).not.toHaveBeenCalled();
    expect(tx.tripEvent.createMany).not.toHaveBeenCalled();
    expect(tx.trip.update).not.toHaveBeenCalled();
  });
});
