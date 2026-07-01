import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTrip, listTrips } from "@/lib/services/trip.service";
import { TripInputSchema } from "@/lib/schemas/trip.schema";
import { AIRateLimitError, AIValidationError } from "@/lib/services/ai-generation.service";
import { ZodError } from "zod";

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
