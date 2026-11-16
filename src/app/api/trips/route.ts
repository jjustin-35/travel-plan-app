import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getTripsByUser } from "@/lib/db/trip.repository";
import { TripInputSchema } from "@/lib/schemas/trip.schema";

const BULLMQ_ENABLED = process.env.TRIP_REDIS_STORAGE_REDIS_URL !== undefined && process.env.TRIP_REDIS_STORAGE_REDIS_URL !== "";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trips = await getTripsByUser(user.id);
  return NextResponse.json({ trips });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let input;
  try {
    input = TripInputSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 422 });
    }
    throw err;
  }

  if (BULLMQ_ENABLED) {
    try {
      const { createQueuedTripGeneration } = await import("@/lib/queue/enqueue");
      const { trip, jobId } = await createQueuedTripGeneration(user.id, input);
      return NextResponse.json({ trip, jobId, async: true }, { status: 202 });
    } catch (err) {
      console.error("POST /api/trips queue error:", err);
      return NextResponse.json(
        { error: "Failed to start trip generation, please try again" },
        { status: 500 }
      );
    }
  } else {
    // Sync path (no Redis): call Gemini directly
    const { createTrip } = await import("@/lib/services/trip.service");
    const { AIRateLimitError, AIValidationError } = await import("@/lib/services/ai-generation.service");
    try {
      const trip = await createTrip(user.id, input);
      return NextResponse.json({ trip }, { status: 201 });
    } catch (err) {
      if (err instanceof AIRateLimitError) {
        console.error(err);
        return NextResponse.json(
          { error: "AI service busy, please retry in a moment" },
          { status: 429 }
        );
      }
      if (err instanceof AIValidationError) {
        return NextResponse.json(
          { error: "AI failed to generate a valid itinerary, please try again" },
          { status: 500 }
        );
      }
      console.error("POST /api/trips error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}
