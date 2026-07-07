import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrip, patchTrip, deleteTrip } from "@/lib/services/trip.service";
import { z, ZodError } from "zod";

import { TransportModeSchema } from "@/lib/schemas/trip.schema";

const PatchBodySchema = z.object({
  client_version: z.number().int(),
  client_modified_at: z.string().datetime(),
  days: z.array(
    z.object({
      day_number: z.number().int().positive(),
      events: z.array(
        z.object({
          id: z.string().uuid(),
          title: z.string(),
          location: z.string(),
          description: z.string(),
          category: z.string(),
          event_time: z.string(),
          duration_minutes: z.number().int().positive(),
          sort_order: z.number().int().positive(),
          lat: z.number(),
          lng: z.number(),
          travel_from_mode: TransportModeSchema.nullable(),
          travel_from_minutes: z.number().int().nonnegative().nullable(),
        })
      ),
    })
  ),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trip = await getTrip(id, user.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ trip });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = PatchBodySchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 422 });
    }
    throw err;
  }

  const result = await patchTrip(
    id,
    user.id,
    parsed.client_version,
    parsed.client_modified_at,
    parsed.days.map((d) => ({
      dayNumber: d.day_number,
      events: d.events.map((e) => ({
        id: e.id,
        title: e.title,
        location: e.location,
        description: e.description,
        category: e.category,
        eventTime: e.event_time,
        durationMinutes: e.duration_minutes,
        sortOrder: e.sort_order,
        lat: e.lat,
        lng: e.lng,
        travelFromMode: e.travel_from_mode,
        travelFromMinutes: e.travel_from_minutes,
      })),
    }))
  );

  if (result.conflict) {
    return NextResponse.json(
      { error: "Conflict", currentVersion: result.currentVersion },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteTrip(id, user.id);
  return NextResponse.json({ success: true });
}
