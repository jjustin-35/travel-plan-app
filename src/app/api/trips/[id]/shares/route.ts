import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

// GET /api/trips/[id]/shares — list share links for this trip
export async function GET(_req: Request, { params }: Params) {
  const { id: tripId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shares = await prisma.tripShare.findMany({
    where: { tripId, createdBy: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shareToken: true,
      permission: true,
      createdAt: true,
      isActive: true,
    },
  });

  return NextResponse.json({ shares });
}

// POST /api/trips/[id]/shares — create a new share link
export async function POST(_req: Request, { params }: Params) {
  const { id: tripId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId: user.id } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const shareToken = crypto.randomBytes(16).toString("hex");
  const share = await prisma.tripShare.create({
    data: { tripId, createdBy: user.id, shareToken, permission: "view" },
  });

  return NextResponse.json({ share }, { status: 201 });
}
