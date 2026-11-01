import { randomUUID } from "crypto";

import { prisma } from "@/lib/db/prisma";
import { getTripQueue, type TripGenerationJobData } from "@/lib/queue/queue";

type TripGenerationInput = TripGenerationJobData["input"];

export async function enqueueTripGeneration(
  tripId: string,
  userId: string,
  input: TripGenerationInput,
  options?: { bypassCache?: boolean }
): Promise<string> {
  const idempotencyKey = randomUUID();
  let jobId: string | undefined;

  try {
    const job = await prisma.aIGenerationJob.create({
      data: {
        tripId,
        userId,
        idempotencyKey,
        status: "pending",
        promptInput: JSON.parse(JSON.stringify(input)),
      },
    });
    jobId = job.id;

    await getTripQueue().add(
      "generate-trip",
      {
        tripId,
        userId,
        input,
        idempotencyKey,
        bypassCache: options?.bypassCache,
      },
      { jobId: idempotencyKey }
    );
    return job.id;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to enqueue generation job";
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "failed" },
    });
    if (jobId) {
      await prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: { status: "failed", errorMessage },
      });
    }
    throw err;
  }
}
