// Must be first: loads .env before any env-reading module (e.g. Prisma) is evaluated.
import "./load-env";

import { Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

import { prisma } from "../src/lib/db/prisma";
import { TripResponseSchema } from "../src/lib/schemas/trip.schema";
import type { TripResponse } from "../src/lib/schemas/trip.schema";
import type { TripGenerationJobData } from "../src/lib/queue/queue";
import { buildCacheKey } from "../src/lib/cache-key";
import {
  generateWorkerTrip,
  persistGeneratedTripResult,
} from "../src/lib/worker/trip-generation";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

type JobData = TripGenerationJobData;

async function saveTripResult(tripId: string, aiResult: TripResponse) {
  await prisma.$transaction(async (tx) => {
    await tx.tripDay.deleteMany({ where: { tripId } });
    await tx.trip.update({
      where: { id: tripId },
      data: {
        title: aiResult.trip.title,
        status: "ready",
        version: { increment: 1 },
      },
    });

    for (const day of aiResult.trip.days) {
      const tripDay = await tx.tripDay.create({
        data: {
          tripId,
          dayNumber: day.day,
          date: new Date(day.date),
        },
      });
      await tx.tripEvent.createMany({
        data: day.events.map((e) => ({
          id: e.id,
          tripDayId: tripDay.id,
          title: e.title,
          location: e.location,
          description: e.description,
          category: e.category,
          eventTime: e.event_time,
          durationMinutes: e.duration_minutes,
          sortOrder: e.sort_order,
          lat: e.lat,
          lng: e.lng,
        })),
      });
    }
  });
}

const worker = new Worker<JobData>(
  "trip-generation",
  async (job) => {
    const { tripId, userId, input } = job.data;
    console.log(`[Worker] Processing job ${job.id} for trip ${tripId}`);

    const cacheKey = buildCacheKey(userId, input);

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[Worker] Cache hit for trip ${tripId}`);
      const aiResult = TripResponseSchema.parse(JSON.parse(cached));
      await saveTripResult(tripId, aiResult);
      return;
    }

    const aiResult = await generateWorkerTrip(input);
    await persistGeneratedTripResult({
      cacheKey,
      aiResult,
      cacheWriter: redis,
      saveTripResult: (result) => saveTripResult(tripId, result),
      onCacheError: (err) => {
        console.error(`[Worker] Failed to cache trip ${tripId}:`, err);
      },
    });

    // Update AI job status
    await prisma.aIGenerationJob.updateMany({
      where: { tripId, status: "processing" },
      data: { status: "done", completedAt: new Date() },
    });

    console.log(`[Worker] Completed job ${job.id} for trip ${tripId}`);
  },
  {
    // The app's ioredis and bullmq's bundled ioredis are separate copies, so
    // the Redis instance must be cast to bullmq's expected connection type.
    connection: redis as unknown as ConnectionOptions,
    concurrency: 3,
  }
);

worker.on("failed", async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  if (job?.data.tripId) {
    await prisma.trip.update({
      where: { id: job.data.tripId },
      data: { status: "failed" },
    });
    await prisma.aIGenerationJob.updateMany({
      where: { tripId: job.data.tripId, status: "processing" },
      data: { status: "failed", errorMessage: err.message },
    });
  }
});

worker.on("ready", () => {
  console.log("[Worker] BullMQ worker ready, listening for jobs...");
});

process.on("SIGTERM", async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
