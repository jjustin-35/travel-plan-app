import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getTripById } from "@/lib/db/trip.repository";
import { prisma } from "@/lib/db/prisma";
import { TripInputSchema } from "@/lib/schemas/trip.schema";

type RouteParams = { params: Promise<{ id: string }> };

const BULLMQ_ENABLED = process.env.REDIS_URL !== undefined && process.env.REDIS_URL !== "";

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getTripById(id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { notes?: string; input?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine
  }

  let input;
  try {
    input = TripInputSchema.parse(
      body.input ?? {
        destination: existing.destination,
        startDate: existing.startDate.toISOString().split("T")[0],
        endDate: existing.endDate.toISOString().split("T")[0],
        days: existing.days.length,
        nights: Math.max(existing.days.length - 1, 0),
        peopleCount: existing.peopleCount,
        tripType: existing.tripType,
      }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 422 });
    }
    throw err;
  }

  await prisma.trip.update({
    where: { id },
    data: { status: "generating" },
  });

  if (BULLMQ_ENABLED) {
    try {
      const { enqueueTripGeneration } = await import("@/lib/queue/enqueue");
      const jobId = await enqueueTripGeneration(id, user.id, input, { bypassCache: true });
      return NextResponse.json({ jobId, async: true }, { status: 202 });
    } catch (err) {
      console.error("POST regenerate queue error:", err);
      return NextResponse.json(
        { error: "Failed to start trip generation, please try again" },
        { status: 500 }
      );
    }
  }

  const { regenerateTrip } = await import("@/lib/services/trip.service");
  const { AIRateLimitError, AIValidationError } = await import(
    "@/lib/services/ai-generation.service"
  );
  try {
    const trip = await regenerateTrip(user.id, id, input);
    return NextResponse.json({ trip });
  } catch (err) {
    await prisma.trip.update({
      where: { id },
      data: { status: "failed" },
    });
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
    console.error("POST regenerate error:", err);
    return NextResponse.json({ error: "Regeneration failed" }, { status: 500 });
  }
}
