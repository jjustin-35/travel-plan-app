import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { validTripInput, validTripResponse } from "@/__test__/fixtures";
import { prisma } from "@/lib/db/prisma";
import { getTripById } from "@/lib/db/trip.repository";
import { generateTrip } from "@/lib/services/ai-generation.service";
import { createClient } from "@/lib/supabase/server";

import { POST } from "../route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/ai-generation.service", () => ({
  generateTrip: vi.fn(),
}));

vi.mock("@/lib/db/trip.repository", () => ({
  getTripById: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trip: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockCreateClient = createClient as Mock;
const mockGenerateTrip = generateTrip as Mock;
const mockGetTripById = getTripById as Mock;
const mockPrisma = prisma as unknown as {
  trip: { update: Mock };
  $transaction: Mock;
};

const existingTrip = {
  id: "trip-1",
  destination: "東京",
  startDate: new Date("2026-04-01T00:00:00.000Z"),
  endDate: new Date("2026-04-05T00:00:00.000Z"),
  days: [{ id: "day-old", dayNumber: 1 }],
  peopleCount: 2,
  tripType: "自由行",
};

function createRequest() {
  return new Request("http://localhost/api/trips/trip-1/regenerate", {
    method: "POST",
    body: JSON.stringify({ input: validTripInput }),
  }) as NextRequest;
}

function createTransaction() {
  return {
    tripDay: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: "day-1" }),
    },
    tripEvent: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    trip: {
      update: vi.fn().mockResolvedValue({ id: "trip-1" }),
    },
  };
}

describe("POST /api/trips/[id]/regenerate", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
    });
    mockGenerateTrip.mockResolvedValue(validTripResponse);
    mockPrisma.trip.update.mockResolvedValue({ id: "trip-1" });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(createTransaction())
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not mark a regenerated trip failed when the post-commit read fails", async () => {
    const tx = createTransaction();
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));
    mockGetTripById
      .mockResolvedValueOnce(existingTrip)
      .mockRejectedValueOnce(new Error("read failed"));

    const response = await POST(createRequest(), {
      params: Promise.resolve({ id: "trip-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Regeneration failed" });
    expect(mockPrisma.trip.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.trip.update).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { status: "generating" },
    });
    expect(tx.trip.update).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: {
        title: validTripResponse.trip.title,
        status: "ready",
        version: { increment: 1 },
      },
    });
  });

  it("marks the trip failed when generation fails before persistence", async () => {
    mockGetTripById.mockResolvedValueOnce(existingTrip);
    mockGenerateTrip.mockRejectedValueOnce(new Error("AI failed"));

    const response = await POST(createRequest(), {
      params: Promise.resolve({ id: "trip-1" }),
    });

    expect(response.status).toBe(500);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.trip.update).toHaveBeenNthCalledWith(1, {
      where: { id: "trip-1" },
      data: { status: "generating" },
    });
    expect(mockPrisma.trip.update).toHaveBeenNthCalledWith(2, {
      where: { id: "trip-1" },
      data: { status: "failed" },
    });
  });
});
