import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTrips } from "@/lib/services/trip.service";
import { TripInputSchema } from "@/lib/schemas/trip.schema";
import { ZodError } from "zod";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";

const BULLMQ_ENABLED = process.env.REDIS_URL !== undefined && process.env.REDIS_URL !== "";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trips = await listTrips(user.id);
  return NextResponse.json({ trips });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    // Async path: enqueue BullMQ job
    const { getTripQueue } = await import("@/lib/queue/queue");
    const idempotencyKey = randomUUID();

    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        title: `${input.destination} 行程`,
        destination: input.destination,
        peopleCount: input.peopleCount,
        tripType: input.tripType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "generating",
      },
    });

    await prisma.aIGenerationJob.create({
      data: {
        tripId: trip.id,
        userId: user.id,
        idempotencyKey,
        status: "pending",
        promptInput: JSON.parse(JSON.stringify(input)),
      },
    });

    await getTripQueue().add(
      "generate-trip",
      { tripId: trip.id, userId: user.id, input, idempotencyKey },
      { jobId: idempotencyKey }
    );

    return NextResponse.json({ trip, async: true }, { status: 202 });
  } else {
    // Sync path (no Redis): call Claude directly
    const { createTrip } = await import("@/lib/services/trip.service");
    const { AIRateLimitError, AIValidationError } = await import("@/lib/services/ai-generation.service");
    try {
      const trip = await createTrip(user.id, input);
      return NextResponse.json({ trip }, { status: 201 });
    } catch (err) {
      if (err instanceof AIRateLimitError) {
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
