import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockGenerateTrip = vi.fn();
const mockGetTripById = vi.fn();
const mockTripUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock("@/lib/services/ai-generation.service", () => ({
  generateTrip: mockGenerateTrip,
}));

vi.mock("@/lib/db/trip.repository", () => ({
  getTripById: mockGetTripById,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trip: {
      update: mockTripUpdate,
    },
    $transaction: mockTransaction,
  },
}));

describe("POST /api/trips/[id]/regenerate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetTripById.mockResolvedValue({
      id: "trip-1",
      destination: "Tokyo",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-03T00:00:00.000Z"),
      days: [{ id: "day-1" }, { id: "day-2" }, { id: "day-3" }],
      peopleCount: 2,
      tripType: "family",
    });
    mockTripUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the trip failed if synchronous regeneration times out", async () => {
    const { POST } = await import("./route");
    mockGenerateTrip.mockReturnValue(new Promise(() => {}));

    const responsePromise = POST(
      new Request("http://localhost/api/trips/trip-1/regenerate", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "trip-1" }) }
    );

    await vi.advanceTimersByTimeAsync(55_000);

    const response = await responsePromise;
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Regeneration failed",
    });
    expect(mockTripUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "trip-1" },
      data: { status: "generating" },
    });
    expect(mockTripUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "trip-1" },
      data: { status: "failed" },
    });
  });
});
