import { describe, expect, it, vi } from "vitest";
import {
  markGenerationJobDone,
  markGenerationJobFailed,
  markGenerationJobProcessing,
} from "@/lib/worker/job-status";

function createDbMock() {
  return {
    aIGenerationJob: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    trip: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("generation job status helpers", () => {
  it("marks pending generation jobs as processing before work starts", async () => {
    const db = createDbMock();

    await expect(markGenerationJobProcessing(db, "job-key")).resolves.toBe(true);

    expect(db.aIGenerationJob.updateMany).toHaveBeenCalledWith({
      where: {
        idempotencyKey: "job-key",
        status: { in: ["pending", "processing", "failed"] },
      },
      data: {
        status: "processing",
        errorMessage: null,
      },
    });
  });

  it("skips BullMQ work when the generation record was deleted or completed", async () => {
    const db = createDbMock();
    db.aIGenerationJob.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(markGenerationJobProcessing(db, "job-key")).resolves.toBe(false);
  });

  it("marks the processing generation job done", async () => {
    const db = createDbMock();

    await markGenerationJobDone(db, "job-key");

    expect(db.aIGenerationJob.updateMany).toHaveBeenCalledWith({
      where: {
        idempotencyKey: "job-key",
        status: "processing",
      },
      data: {
        status: "done",
        completedAt: expect.any(Date),
        errorMessage: null,
      },
    });
  });

  it("uses updateMany when marking failures so deleted trips do not throw", async () => {
    const db = createDbMock();
    db.trip.updateMany.mockResolvedValueOnce({ count: 0 });
    db.aIGenerationJob.updateMany.mockResolvedValueOnce({ count: 0 });

    await markGenerationJobFailed(db, "trip-1", "job-key", "generation failed");

    expect(db.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { status: "failed" },
    });
    expect(db.aIGenerationJob.updateMany).toHaveBeenCalledWith({
      where: {
        idempotencyKey: "job-key",
        status: { in: ["pending", "processing", "failed"] },
      },
      data: {
        status: "failed",
        errorMessage: "generation failed",
      },
    });
  });
});
