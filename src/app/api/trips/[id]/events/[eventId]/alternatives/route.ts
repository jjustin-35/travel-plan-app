import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAlternatives } from "@/lib/services/ai-generation.service";
import { getTripById } from "@/lib/db/trip.repository";
import { TripEventSchema } from "@/lib/schemas/trip.schema";
import { z, ZodError } from "zod";

const RequestBodySchema = z.object({
  event: TripEventSchema,
  context: z.object({
    day_date: z.string(),
    surrounding_events: z.array(TripEventSchema),
  }),
});

type RouteParams = { params: Promise<{ id: string; eventId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trip = await getTripById(id, user.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = RequestBodySchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 422 });
    }
    throw err;
  }

  if (parsed.event.id !== eventId) {
    return NextResponse.json(
      { error: "Event id in body does not match URL" },
      { status: 422 }
    );
  }

  const ownsEvent = trip.days.some((day) =>
    day.events.some((event) => event.id === eventId)
  );
  if (!ownsEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  try {
    const alternatives = await generateAlternatives(
      parsed.event,
      parsed.context.surrounding_events,
      parsed.context.day_date
    );
    return NextResponse.json({ alternatives });
  } catch (err) {
    console.error("POST alternatives error:", err);
    return NextResponse.json(
      { error: "Failed to generate alternatives, please try again" },
      { status: 500 }
    );
  }
}
