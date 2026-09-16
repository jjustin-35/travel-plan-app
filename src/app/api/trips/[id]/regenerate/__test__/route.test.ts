import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validTripInput } from "@/__test__/fixtures";

const mockGetUser = vi.fn();
const mockGenerateTrip = vi.fn();
const mockGetTripById = vi.fn();
const mockTripUpdate = vi.fn();
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/services/ai-generation.service", () => ({
  generateTrip: (...args: unknown[]) => mockGenerateTrip(...args),
}));

vi.mock("@/lib/db/trip.repository", () => ({
  getTripById: (...args: unknown[]) => mockGetTripById(...args),
  createTripWithDays: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trip: {
      update: (...args: unknown[]) => mockTripUpdate(...args),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "../route";

function createRegenerateRequest() {
  return new Request("http://localhost/api/trips/trip-1/regenerate", {
    method: "POST",
    body: JSON.stringify({ input: validTripInput }),
  });
}

describe("POST /api/trips/[id]/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockTripUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("restores ready status when regeneration fails before replacing days", async () => {
    mockGetTripById.mockResolvedValue({
      id: "trip-1",
      status: "ready",
    });
    mockGenerateTrip.mockRejectedValue(new Error("Gemini unavailable"));

    const response = await POST(createRegenerateRequest(), {
      params: Promise.resolve({ id: "trip-1" }),
    });

    expect(response.status).toBe(500);
    expect(mockTripUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "trip-1" },
      data: { status: "generating" },
    });
    expect(mockTripUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "trip-1" },
      data: { status: "ready" },
    });
  });

  it("keeps failed status when retrying a failed trip also fails", async () => {
    mockGetTripById.mockResolvedValue({
      id: "trip-1",
      status: "failed",
    });
    mockGenerateTrip.mockRejectedValue(new Error("Gemini unavailable"));

    const response = await POST(createRegenerateRequest(), {
      params: Promise.resolve({ id: "trip-1" }),
    });

    expect(response.status).toBe(500);
    expect(mockTripUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "trip-1" },
      data: { status: "failed" },
    });
  });
});
