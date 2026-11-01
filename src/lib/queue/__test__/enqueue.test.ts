import { beforeEach, describe, expect, it, vi } from "vitest";

import { enqueueTripGeneration } from "@/lib/queue/enqueue";
import { validTripInput } from "@/__test__/fixtures";

const add = vi.fn();
const jobCreate = vi.fn();
const jobUpdate = vi.fn();
const tripUpdate = vi.fn();

vi.mock("@/lib/queue/queue", () => ({
  getTripQueue: () => ({ add }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    aIGenerationJob: {
      create: (...args: unknown[]) => jobCreate(...args),
      update: (...args: unknown[]) => jobUpdate(...args),
    },
    trip: {
      update: (...args: unknown[]) => tripUpdate(...args),
    },
  },
}));

describe("enqueueTripGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobCreate.mockResolvedValue({ id: "job-1" });
    add.mockResolvedValue(undefined);
  });

  it("enqueues a generation job and skips cache when asked", async () => {
    const jobId = await enqueueTripGeneration("trip-1", "user-1", validTripInput, {
      bypassCache: true,
    });

    expect(jobId).toBe("job-1");
    expect(add).toHaveBeenCalledWith(
      "generate-trip",
      expect.objectContaining({
        tripId: "trip-1",
        userId: "user-1",
        input: validTripInput,
        bypassCache: true,
      }),
      expect.objectContaining({ jobId: expect.any(String) })
    );
    const payload = add.mock.calls[0][1] as { idempotencyKey: string };
    expect(add.mock.calls[0][2]).toEqual({ jobId: payload.idempotencyKey });
  });

  it("marks the trip and job failed when the queue rejects", async () => {
    add.mockRejectedValue(new Error("redis down"));

    await expect(
      enqueueTripGeneration("trip-1", "user-1", validTripInput)
    ).rejects.toThrow("redis down");

    expect(tripUpdate).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { status: "failed" },
    });
    expect(jobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "failed", errorMessage: "redis down" },
    });
  });
});
