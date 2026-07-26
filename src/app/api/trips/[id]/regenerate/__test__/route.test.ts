import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mockCreateClient = vi.fn();
const mockGenerateTrip = vi.fn();
const mockGetTripById = vi.fn();
const mockCreateTripWithDays = vi.fn();
const mockPrismaTripUpdate = vi.fn();
const mockPrismaTransaction = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/lib/services/ai-generation.service", () => ({
  generateTrip: (...args: unknown[]) => mockGenerateTrip(...args),
}));

vi.mock("@/lib/db/trip.repository", () => ({
  getTripById: (...args: unknown[]) => mockGetTripById(...args),
  createTripWithDays: (...args: unknown[]) => mockCreateTripWithDays(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trip: {
      update: (...args: unknown[]) => mockPrismaTripUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}));

function makePostRequest(body: unknown = {}) {
  return new NextRequest("https://example.com/api/trips/trip-1/regenerate", {
    method: "POST",
    body: JSON.stringify(body),
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
  });

  it("rejects regeneration while the original generation is still running", async () => {
    mockGetTripById.mockResolvedValue({
      id: "trip-1",
      userId: "user-1",
      status: "generating",
    });

    const response = await POST(makePostRequest(), {
      params: Promise.resolve({ id: "trip-1" }),
    });

    await expect(response.json()).resolves.toEqual({
      error: "Trip generation is already in progress",
    });
    expect(response.status).toBe(409);
    expect(mockGetTripById).toHaveBeenCalledWith("trip-1", "user-1");
    expect(mockPrismaTripUpdate).not.toHaveBeenCalled();
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
    expect(mockGenerateTrip).not.toHaveBeenCalled();
  });
});
