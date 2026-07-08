import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTrip } from "@/lib/services/ai-generation.service";
import { getTripById, createTripWithDays } from "@/lib/db/trip.repository";
import { TripInputSchema } from "@/lib/schemas/trip.schema";
import { prisma } from "@/lib/db/prisma";
import { ZodError } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trip = await getTripById(id, user.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (trip.status === "generating") {
    return NextResponse.json(
      { error: "Trip generation is already in progress" },
      { status: 409 }
    );
  }

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
        destination: trip.destination,
        startDate: trip.startDate.toISOString().split("T")[0],
        endDate: trip.endDate.toISOString().split("T")[0],
        days: trip.days.length,
        nights: trip.days.length - 1,
        peopleCount: trip.peopleCount,
        tripType: trip.tripType,
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

  try {
    const aiResult = await generateTrip(input);

    await prisma.$transaction(async (tx) => {
      await tx.tripDay.deleteMany({ where: { tripId: id } });

      for (const day of aiResult.trip.days) {
        const tripDay = await tx.tripDay.create({
          data: {
            tripId: id,
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

      await tx.trip.update({
        where: { id },
        data: {
          title: aiResult.trip.title,
          status: "ready",
          version: { increment: 1 },
        },
      });
    });

    const updated = await getTripById(id, user.id);
    return NextResponse.json({ trip: updated });
  } catch (err) {
    await prisma.trip.update({
      where: { id },
      data: { status: "failed" },
    });
    console.error("POST regenerate error:", err);
    return NextResponse.json({ error: "Regeneration failed" }, { status: 500 });
  }
}
