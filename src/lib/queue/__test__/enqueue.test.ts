import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createQueuedTripGeneration,
  enqueueTripGeneration,
  recoverPendingGenerationJobs,
} from "@/lib/queue/enqueue";
import { validTripInput } from "@/__test__/fixtures";

const add = vi.fn();
const jobCreate = vi.fn();
const jobFindMany = vi.fn();
const jobUpdate = vi.fn();
const transaction = vi.fn();
const txJobCreate = vi.fn();
const txTripCreate = vi.fn();
const tripUpdate = vi.fn();

vi.mock("@/lib/queue/queue", () => ({
  getTripQueue: () => ({ add }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transaction(...args),
    aIGenerationJob: {
      create: (...args: unknown[]) => jobCreate(...args),
      findMany: (...args: unknown[]) => jobFindMany(...args),
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
    jobFindMany.mockResolvedValue([]);
    txJobCreate.mockResolvedValue({ id: "job-1" });
    txTripCreate.mockResolvedValue({ id: "trip-1", status: "generating" });
    transaction.mockImplementation(async (callback) =>
      callback({
        aIGenerationJob: { create: txJobCreate },
        trip: { create: txTripCreate },
      })
    );
    add.mockResolvedValue(undefined);
  });

  it("creates a pending trip and generation job transactionally before enqueueing", async () => {
    const result = await createQueuedTripGeneration("user-1", validTripInput);

    expect(result).toEqual({
      trip: { id: "trip-1", status: "generating" },
      jobId: "job-1",
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txTripCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        destination: validTripInput.destination,
        status: "generating",
      }),
    });
    expect(txJobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tripId: "trip-1",
        userId: "user-1",
        status: "pending",
        promptInput: validTripInput,
      }),
    });
    const payload = add.mock.calls[0][1] as { idempotencyKey: string };
    expect(add).toHaveBeenCalledWith(
      "generate-trip",
      expect.objectContaining({
        tripId: "trip-1",
        userId: "user-1",
        input: validTripInput,
      }),
      { jobId: payload.idempotencyKey }
    );
  });

  it("marks a transactionally created trip and job failed when enqueue rejects", async () => {
    add.mockRejectedValue(new Error("redis down"));

    await expect(
      createQueuedTripGeneration("user-1", validTripInput)
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

  it("recovers pending generation jobs by enqueueing their outbox payloads", async () => {
    jobFindMany.mockResolvedValue([
      {
        tripId: "trip-1",
        userId: "user-1",
        idempotencyKey: "idem-1",
        promptInput: validTripInput,
      },
    ]);

    const count = await recoverPendingGenerationJobs();

    expect(count).toBe(1);
    expect(jobFindMany).toHaveBeenCalledWith({
      where: {
        status: "pending",
        trip: { status: "generating" },
      },
      select: {
        tripId: true,
        userId: true,
        idempotencyKey: true,
        promptInput: true,
      },
    });
    expect(add).toHaveBeenCalledWith(
      "generate-trip",
      expect.objectContaining({
        tripId: "trip-1",
        userId: "user-1",
        input: validTripInput,
        idempotencyKey: "idem-1",
      }),
      { jobId: "idem-1" }
    );
  });
});
