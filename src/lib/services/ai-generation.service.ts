import { GoogleGenAI } from "@google/genai";
import { ZodError } from "zod";
import {
  TripInput,
  TripResponse,
  TripResponseSchema,
  AlternativeEventsSchema,
  TripEvent,
} from "@/lib/schemas/trip.schema";
import { buildTripGenerationPrompt } from "@/lib/ai/trip-generation-prompt";

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
- Keep the same event_time, sort_order, travel_from_mode, and travel_from_minutes as the original
- Keep duration_minutes similar (within ±30 minutes)
- title, location, description must be in Traditional Chinese (繁體中文)
- Do not suggest the same place as the original event

Respond ONLY with a valid JSON array of exactly 3 event objects using the same schema as a regular event.`;

function buildBasePrompt(input: TripInput): string {
  return buildTripGenerationPrompt(input);
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
  let lastErrorMessage: string | undefined;

  for (let attempt = 0; attempt <= MAX_INTERNAL_RETRIES; attempt++) {
    let prompt = buildBasePrompt(input);

    if (attempt > 0 && previousResponse) {
      const correctionMessage =
        lastErrorMessage ??
        "Previous response failed JSON schema validation.";
      prompt += buildFormatCorrectionContext(previousResponse, correctionMessage);
    }

    const raw = await callGemini(prompt);
    previousResponse = raw;

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return TripResponseSchema.parse(parsed);
    } catch (err) {
      const isRetryable = err instanceof ZodError || err instanceof SyntaxError;
      if (isRetryable) {
        lastErrorMessage =
          err instanceof Error ? err.message : "Invalid JSON response";
        if (attempt === MAX_INTERNAL_RETRIES) {
          throw new AIValidationError(
            `AI returned invalid format after ${MAX_INTERNAL_RETRIES + 1} attempts: ${lastErrorMessage}`
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
  let previousResponse = "";
  let lastErrorMessage: string | undefined;

  for (let attempt = 0; attempt <= MAX_INTERNAL_RETRIES; attempt++) {
    let prompt = ALTERNATIVES_PROMPT_TEMPLATE.replace(
      "{{current_event_json}}",
      JSON.stringify(currentEvent, null, 2)
    )
      .replace("{{day_date}}", dayDate)
      .replace(
        "{{surrounding_events_json}}",
        JSON.stringify(surroundingEvents, null, 2)
      )
      .replace("{{category}}", currentEvent.category);

    if (attempt > 0 && previousResponse) {
      const correctionMessage =
        lastErrorMessage ??
        "Previous response failed JSON schema validation.";
      prompt += buildFormatCorrectionContext(previousResponse, correctionMessage);
    }

    const raw = await callGemini(prompt);
    previousResponse = raw;

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return AlternativeEventsSchema.parse(parsed);
    } catch (err) {
      const isRetryable = err instanceof ZodError || err instanceof SyntaxError;
      if (isRetryable) {
        lastErrorMessage =
          err instanceof Error ? err.message : "Invalid JSON response";
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
