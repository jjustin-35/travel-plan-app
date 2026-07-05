import { GoogleGenAI } from "@google/genai";
import { ZodError } from "zod";
import {
  TripInput,
  TripResponse,
  TripResponseSchema,
  AlternativeEventsSchema,
  TripEvent,
} from "@/lib/schemas/trip.schema";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

// Lazily create the Gemini client so importing this module never fails when the
// API key is absent (e.g. during build or in unit tests where it is mocked).
function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export class AIRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIRateLimitError";
  }
}

export class AIValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIValidationError";
  }
}

const BASE_PROMPT_TEMPLATE = `You are an expert travel planner specializing in creating detailed, personalized itineraries. Your goal is to design a realistic, enjoyable travel schedule based on the traveler's preferences.

## Traveler Information
- Destination: {{destination}}
- Duration: {{days}} days {{nights}} nights
- Departure date: {{start_date}}
- Return date: {{end_date}}
- Number of travelers: {{people_count}}
- Trip type: {{trip_type}}
- Budget range: {{budget_range}}
- Preferred styles: {{preferred_styles}}
- Special requirements: {{special_requirements}}

## Task
Generate a complete day-by-day travel itinerary in JSON format. The itinerary should feel natural and well-paced, like a plan crafted by a knowledgeable local guide.

## Schedule Density Guidelines
- Generate between 3 to 8 events per day
- Fewer events (3–4) for relaxation trips, family trips with elderly or young children
- More events (6–8) for short trips, city tours, solo travelers, friend groups
- Always include realistic travel time between locations
- Include at least one meal event per day

## Output Format
Respond ONLY with a valid JSON object. Do not include any explanation, markdown, or text outside the JSON.

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
            "description": "string",
            "category": "景點 | 餐廳 | 咖啡廳 | 交通 | 住宿 | 購物 | 其他",
            "event_time": "HH:MM",
            "duration_minutes": 90,
            "sort_order": 1,
            "lat": 35.7148,
            "lng": 139.7967
          }
        ]
      }
    ]
  }
}

## Field Rules
- id: Must be a valid UUID v4. Never reuse IDs.
- category: Must be exactly one of the listed options.
- event_time: HH:MM format, chronological order within each day.
- sort_order: Starts at 1, increments by 1 within each day.
- lat/lng: Real-world coordinates. Do not fabricate.
- description, title, location: Must be in Traditional Chinese (繁體中文).`;

const FORMAT_CORRECTION_TEMPLATE = `## Format Correction Required
Your previous response contained JSON that failed validation. Please fix the issues and return a corrected response.

Your previous response:
{{previous_response}}

Validation errors:
{{zod_error_messages}}

## Instructions
- Fix ONLY the fields mentioned in the validation errors above.
- Do not change any other content.
- Return the complete corrected JSON object.
- Ensure the output is valid JSON with no markdown or extra text.`;

const ALTERNATIVES_PROMPT_TEMPLATE = `You are an expert travel planner. A traveler wants 3 alternative options for one event in their itinerary.

Event to replace:
{{current_event_json}}

Surrounding context:
Day date: {{day_date}}
Surrounding events: {{surrounding_events_json}}

Requirements:
- All 3 alternatives must be the same category: {{category}}
- Geographically reasonable given surrounding events
- Each must have a unique UUID v4 as id
- Keep the same event_time as the original
- Keep duration_minutes similar (within ±30 minutes)
- title, location, description must be in Traditional Chinese (繁體中文)
- Do not suggest the same place as the original event

Respond ONLY with a valid JSON array of exactly 3 event objects using the same schema as a regular event.`;

function buildBasePrompt(input: TripInput): string {
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
    .replace(
      "{{special_requirements}}",
      input.specialRequirements ?? "None"
    );
}

function buildFormatCorrectionContext(
  previousResponse: string,
  zodErrors: string
): string {
  return (
    "\n\n" +
    FORMAT_CORRECTION_TEMPLATE.replace(
      "{{previous_response}}",
      previousResponse
    ).replace("{{zod_error_messages}}", zodErrors)
  );
}

async function callGemini(prompt: string): Promise<string> {
  try {
    const response = await getClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return text;
  } catch (err: unknown) {
    const error = err as { status?: number; code?: number; message?: string };
    const status = error.status ?? error.code;
    if (
      status === 429 ||
      /rate limit|resource_exhausted|quota/i.test(error.message ?? "")
    ) {
      throw new AIRateLimitError(error.message ?? "Rate limit exceeded");
    }
    throw err;
  }
}

export async function generateTrip(input: TripInput): Promise<TripResponse> {
  const MAX_INTERNAL_RETRIES = 2;
  let previousResponse = "";

  for (let attempt = 0; attempt <= MAX_INTERNAL_RETRIES; attempt++) {
    let prompt = buildBasePrompt(input);

    if (attempt > 0 && previousResponse) {
      const zodErrorMsg = "Previous response failed JSON schema validation.";
      prompt += buildFormatCorrectionContext(previousResponse, zodErrorMsg);
    }

    const raw = await callGemini(prompt);
    previousResponse = raw;

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return TripResponseSchema.parse(parsed);
    } catch (err) {
      if (err instanceof ZodError) {
        if (attempt === MAX_INTERNAL_RETRIES) {
          throw new AIValidationError(
            `AI returned invalid format after ${MAX_INTERNAL_RETRIES + 1} attempts: ${err.message}`
          );
        }
        continue;
      }
      throw err;
    }
  }

  throw new AIValidationError("generateTrip: exhausted retries");
}

export async function generateAlternatives(
  currentEvent: TripEvent,
  surroundingEvents: TripEvent[],
  dayDate: string
): Promise<TripEvent[]> {
  const MAX_INTERNAL_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_INTERNAL_RETRIES; attempt++) {
    const prompt = ALTERNATIVES_PROMPT_TEMPLATE.replace(
      "{{current_event_json}}",
      JSON.stringify(currentEvent, null, 2)
    )
      .replace("{{day_date}}", dayDate)
      .replace(
        "{{surrounding_events_json}}",
        JSON.stringify(surroundingEvents, null, 2)
      )
      .replace("{{category}}", currentEvent.category);

    const raw = await callGemini(prompt);

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return AlternativeEventsSchema.parse(parsed);
    } catch (err) {
      if (err instanceof ZodError) {
        if (attempt === MAX_INTERNAL_RETRIES) {
          throw new AIValidationError("Failed to generate valid alternatives");
        }
        continue;
      }
      throw err;
    }
  }

  throw new AIValidationError("generateAlternatives: exhausted retries");
}
