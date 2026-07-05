// Must be first: loads .env before any env-reading module (e.g. Prisma) is evaluated.
import "./load-env";

import { Worker, type ConnectionOptions } from "bullmq";
import { prisma } from "../src/lib/db/prisma";
import { GoogleGenAI } from "@google/genai";
import IORedis from "ioredis";
import { createHash } from "crypto";
import { ZodError } from "zod";
import { TripResponseSchema } from "../src/lib/schemas/trip.schema";

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

type JobData = {
  tripId: string;
  userId: string;
  input: {
    destination: string;
    startDate: string;
    endDate: string;
    days: number;
    nights: number;
    peopleCount: number;
    tripType: string;
    budgetRange?: string;
    preferredStyles?: string[];
    specialRequirements?: string;
  };
  idempotencyKey: string;
};

function buildCacheKey(userId: string, input: JobData["input"]): string {
  const normalized = {
    destination: input.destination.trim().toLowerCase(),
    startDate: input.startDate,
    endDate: input.endDate,
    peopleCount: input.peopleCount,
    tripType: input.tripType,
    budgetRange: input.budgetRange ?? "",
    preferredStyles: (input.preferredStyles ?? []).sort().join(","),
    specialRequirements: (input.specialRequirements ?? "").trim().toLowerCase(),
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex")
    .slice(0, 16);
  return `trip:${userId}:${hash}`;
}

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

async function saveTripResult(tripId: string, aiResult: { trip: { title: string; days: Array<{ day: number; date: string; events: Array<{ id: string; title: string; location: string; description: string; category: string; event_time: string; duration_minutes: number; sort_order: number; lat: number; lng: number }> }> } }) {
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

    // Generate with Gemini
    const aiResult = await generateTrip(input);

    // Cache result
    await redis.set(cacheKey, JSON.stringify(aiResult), "EX", 600);

    // Save to DB (Supabase Realtime will auto-push to frontend)
    await saveTripResult(tripId, aiResult);

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
