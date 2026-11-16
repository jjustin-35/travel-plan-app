import { randomUUID } from "crypto";

import { prisma } from "@/lib/db/prisma";
import { getTripQueue, type TripGenerationJobData } from "@/lib/queue/queue";
import { TripInputSchema } from "@/lib/schemas/trip.schema";

type TripGenerationInput = TripGenerationJobData["input"];

async function addTripGenerationQueueJob(
  tripId: string,
  userId: string,
  input: TripGenerationInput,
  idempotencyKey: string,
  options?: { bypassCache?: boolean }
) {
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
}

async function markGenerationFailed(
  tripId: string,
  jobId: string | undefined,
  errorMessage: string
) {
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
}

export async function createQueuedTripGeneration(
  userId: string,
  input: TripGenerationInput
) {
  const idempotencyKey = randomUUID();
  let tripId: string | undefined;
  let jobId: string | undefined;

  try {
    const { trip, job } = await prisma.$transaction(async (tx) => {
      const createdTrip = await tx.trip.create({
        data: {
          userId,
          title: `${input.destination} 行程`,
          destination: input.destination,
          peopleCount: input.peopleCount,
          tripType: input.tripType,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: "generating",
        },
      });

      const createdJob = await tx.aIGenerationJob.create({
        data: {
          tripId: createdTrip.id,
          userId,
          idempotencyKey,
          status: "pending",
          promptInput: JSON.parse(JSON.stringify(input)),
        },
      });

      return { trip: createdTrip, job: createdJob };
    });

    tripId = trip.id;
    jobId = job.id;

    await addTripGenerationQueueJob(trip.id, userId, input, idempotencyKey);
    return { trip, jobId: job.id };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to enqueue generation job";
    if (tripId) {
      await markGenerationFailed(tripId, jobId, errorMessage);
    }
    throw err;
  }
}

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

    await addTripGenerationQueueJob(
      tripId,
      userId,
      input,
      idempotencyKey,
      options
    );
    return job.id;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to enqueue generation job";
    await markGenerationFailed(tripId, jobId, errorMessage);
    throw err;
  }
}

export async function recoverPendingGenerationJobs(): Promise<number> {
  const pendingJobs = await prisma.aIGenerationJob.findMany({
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

  for (const job of pendingJobs) {
    const input = TripInputSchema.parse(job.promptInput);
    await addTripGenerationQueueJob(
      job.tripId,
      job.userId,
      input,
      job.idempotencyKey
    );
  }

  return pendingJobs.length;
}
