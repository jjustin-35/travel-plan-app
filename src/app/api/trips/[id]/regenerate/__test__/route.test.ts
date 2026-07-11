import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mockCreateClient = vi.fn();
const mockGenerateTrip = vi.fn();
const mockGetTripById = vi.fn();
const mockPrismaTripUpdate = vi.fn();
const mockPrismaTransaction = vi.fn();
const mockTransactionTripDayDeleteMany = vi.fn();
const mockTransactionTripDayCreate = vi.fn();
const mockTransactionTripEventCreateMany = vi.fn();
const mockTransactionTripUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/lib/services/ai-generation.service", () => ({
  generateTrip: (...args: unknown[]) => mockGenerateTrip(...args),
}));

vi.mock("@/lib/db/trip.repository", () => ({
  getTripById: (...args: unknown[]) => mockGetTripById(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trip: {
      update: (...args: unknown[]) => mockPrismaTripUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}));

function makePostRequest(body?: unknown) {
  return new NextRequest("https://example.com/api/trips/trip-1/regenerate", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/trips/[id]/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
    });
    mockTransactionTripDayCreate.mockResolvedValue({ id: "trip-day-1" });
    mockPrismaTransaction.mockImplementation(async (callback) =>
      callback({
        tripDay: {
          deleteMany: mockTransactionTripDayDeleteMany,
          create: mockTransactionTripDayCreate,
        },
        tripEvent: {
          createMany: mockTransactionTripEventCreateMany,
        },
        trip: {
          update: mockTransactionTripUpdate,
        },
      })
    );
  });

  it("regenerates a failed async trip that has no saved days yet", async () => {
    mockGetTripById
      .mockResolvedValueOnce({
        id: "trip-1",
        destination: "Tokyo",
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-03T00:00:00.000Z"),
        days: [],
        peopleCount: 2,
        tripType: "friends",
      })
      .mockResolvedValueOnce({ id: "trip-1", status: "ready" });
    mockGenerateTrip.mockResolvedValue({
      trip: {
        title: "Tokyo Trip",
        days: [
          {
            day: 1,
            date: "2026-04-01",
            events: [
              {
                id: "event-1",
                title: "Arrival",
                location: "Tokyo Station",
                description: "Arrive in Tokyo",
                category: "交通",
                event_time: "09:00",
                duration_minutes: 60,
                sort_order: 1,
                lat: 35.6812,
                lng: 139.7671,
              },
            ],
          },
        ],
      },
    });

    const response = await POST(makePostRequest(), {
      params: Promise.resolve({ id: "trip-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockGenerateTrip).toHaveBeenCalledWith({
      destination: "Tokyo",
      startDate: "2026-04-01",
      endDate: "2026-04-03",
      days: 3,
      nights: 2,
      peopleCount: 2,
      tripType: "friends",
    });
    expect(mockPrismaTripUpdate).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { status: "generating" },
    });
    await expect(response.json()).resolves.toEqual({
      trip: { id: "trip-1", status: "ready" },
    });
  });
});
