import { GoogleGenAI } from "@google/genai";
import { ZodError } from "zod";

import {
  TripInput,
  TripResponse,
  TripResponseSchema,
} from "@/lib/schemas/trip.schema";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const DEFAULT_GENERATION_TIMEOUT_MS = 120_000;
const MAX_GENERATION_RETRIES = 2;
const CACHE_TTL_SECONDS = 600;

type GenerateContentRequest = {
  model: string;
  contents: string;
  config: {
    responseMimeType: "application/json";
    maxOutputTokens: number;
  };
};

type GenerateContent = (
  request: GenerateContentRequest
) => Promise<{ text?: string }>;

type CacheWriter = {
  set(
    key: string,
    value: string,
    expiryMode: "EX",
    ttlSeconds: number
  ): Promise<unknown>;
};

let genai: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genai) {
    genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genai;
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

function getGenerationTimeoutMs(): number {
  const configured = Number(process.env.AI_GENERATION_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_GENERATION_TIMEOUT_MS;
}

function buildPrompt(input: TripInput): string {
  return BASE_PROMPT_TEMPLATE.replace("{{destination}}", input.destination)
    .replace("{{days}}", String(input.days))
    .replace("{{nights}}", String(input.nights))
    .replace("{{start_date}}", input.startDate)
    .replace("{{end_date}}", input.endDate)
    .replace("{{people_count}}", String(input.peopleCount))
    .replace("{{trip_type}}", input.tripType)
    .replace("{{budget_range}}", input.budgetRange ?? "Not specified")
    .replace(
      "{{preferred_styles}}",
      input.preferredStyles?.join(", ") ?? "Not specified"
    )
    .replace("{{special_requirements}}", input.specialRequirements ?? "None");
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`AI generation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function generateWorkerTrip(
  input: TripInput,
  options: {
    generateContent?: GenerateContent;
    model?: string;
    timeoutMs?: number;
  } = {}
): Promise<TripResponse> {
  const prompt = buildPrompt(input);
  const model = options.model ?? GEMINI_MODEL;
  const timeoutMs = options.timeoutMs ?? getGenerationTimeoutMs();
  const generateContent =
    options.generateContent ??
    ((request: GenerateContentRequest) =>
      getGenAI().models.generateContent(request));

  for (let attempt = 0; attempt <= MAX_GENERATION_RETRIES; attempt++) {
    const response = await withTimeout(
      generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      }),
      timeoutMs
    );

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return TripResponseSchema.parse(parsed);
    } catch (err) {
      const isRetryable = err instanceof ZodError || err instanceof SyntaxError;
      if (isRetryable && attempt < MAX_GENERATION_RETRIES) continue;
      throw err;
    }
  }

  throw new Error("Failed to generate valid trip");
}

export async function persistGeneratedTripResult({
  cacheKey,
  aiResult,
  cacheWriter,
  saveTripResult,
  onCacheError,
}: {
  cacheKey: string;
  aiResult: TripResponse;
  cacheWriter: CacheWriter;
  saveTripResult: (aiResult: TripResponse) => Promise<void>;
  onCacheError?: (err: unknown) => void;
}): Promise<void> {
  await saveTripResult(aiResult);

  try {
    await cacheWriter.set(
      cacheKey,
      JSON.stringify(aiResult),
      "EX",
      CACHE_TTL_SECONDS
    );
  } catch (err) {
    // Generation has already been persisted; cache failures must not mark it failed.
    onCacheError?.(err);
  }
}
