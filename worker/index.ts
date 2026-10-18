// Must be first: loads .env before any env-reading module (e.g. Prisma) is evaluated.
import "./load-env";

import { Worker, type ConnectionOptions } from "bullmq";
import { GoogleGenAI } from "@google/genai";
import IORedis from "ioredis";
import { ZodError } from "zod";
import { prisma } from "../src/lib/db/prisma";
import { TripResponseSchema } from "../src/lib/schemas/trip.schema";
import type { TripGenerationJobData } from "../src/lib/queue/queue";
import { buildCacheKey } from "../src/lib/cache-key";
import {
  markTripGenerationFailed,
  saveTripResult,
  tripExists,
} from "../src/lib/worker/trip-persistence";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

let genai: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genai) {
    genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genai;
}

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

type JobData = TripGenerationJobData;

const BASE_PROMPT_TEMPLATE = `You are an expert travel planner. Generate a complete day-by-day travel itinerary in JSON format.

Traveler Information:
- Destination: {{destination}}
- Duration: {{days}} days {{nights}} nights ({{start_date}} to {{end_date}})
- Travelers: {{people_count}} people
- Trip type: {{trip_type}}
- Budget: {{budget_range}}
- Preferred styles: {{preferred_styles}}
- Special requirements: {{special_requirements}}

Generate 3-8 events per day. Include meals. All text in Traditional Chinese (繁體中文).

Respond ONLY with valid JSON:
{
  "trip": {
    "title": "string",
    "days": [
      {
        "day": 1,
        "date": "YYYY-MM-DD",
        "events": [
          {
            "id": "uuid-v4",
            "title": "string",
            "location": "string",
            "description": "string (繁體中文)",
            "category": "景點 | 餐廳 | 咖啡廳 | 交通 | 住宿 | 購物 | 其他",
            "event_time": "HH:MM",
            "duration_minutes": 90,
            "sort_order": 1,
            "lat": 0.0,
            "lng": 0.0
          }
        ]
      }
    ]
  }
}`;

async function generateTrip(input: JobData["input"]) {
  const prompt = BASE_PROMPT_TEMPLATE
    .replace("{{destination}}", input.destination)
    .replace("{{days}}", String(input.days))
    .replace("{{nights}}", String(input.nights))
    .replace("{{start_date}}", input.startDate)
    .replace("{{end_date}}", input.endDate)
    .replace("{{people_count}}", String(input.peopleCount))
    .replace("{{trip_type}}", input.tripType)
    .replace("{{budget_range}}", input.budgetRange ?? "Not specified")
    .replace("{{preferred_styles}}", input.preferredStyles?.join(", ") ?? "Not specified")
    .replace("{{special_requirements}}", input.specialRequirements ?? "None");

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await getGenAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return TripResponseSchema.parse(parsed);
    } catch (err) {
      if (err instanceof ZodError && attempt < MAX_RETRIES) continue;
      throw err;
    }
  }
  throw new Error("Failed to generate valid trip");
}

const worker = new Worker<JobData>(
  "trip-generation",
  async (job) => {
    const { tripId, userId, input } = job.data;
    console.log(`[Worker] Processing job ${job.id} for trip ${tripId}`);

    if (!(await tripExists(tripId))) {
      console.log(`[Worker] Trip ${tripId} no longer exists; skipping job ${job.id}`);
      return;
    }

    const cacheKey = buildCacheKey(userId, input);

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[Worker] Cache hit for trip ${tripId}`);
      const aiResult = TripResponseSchema.parse(JSON.parse(cached));
      const saved = await saveTripResult(tripId, aiResult);
      if (!saved) {
        console.log(`[Worker] Trip ${tripId} was deleted before save; skipping job ${job.id}`);
      }
      return;
    }

    // Generate with Gemini
    const aiResult = await generateTrip(input);

    // Cache result
    await redis.set(cacheKey, JSON.stringify(aiResult), "EX", 600);

    // Save to DB (Supabase Realtime will auto-push to frontend)
    const saved = await saveTripResult(tripId, aiResult);
    if (!saved) {
      console.log(`[Worker] Trip ${tripId} was deleted before save; skipping job ${job.id}`);
      return;
    }

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
    try {
      await markTripGenerationFailed(job.data.tripId, err.message);
    } catch (updateErr) {
      console.error(
        `[Worker] Failed to record failure for trip ${job.data.tripId}:`,
        updateErr
      );
    }
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
