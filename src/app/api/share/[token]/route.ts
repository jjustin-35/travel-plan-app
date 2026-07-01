import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ token: string }> };

// GET /api/share/[token] — public read-only trip by share token
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const share = await prisma.tripShare.findUnique({
    where: { shareToken: token },
    include: {
      trip: {
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: {
              events: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
  }

  const { trip } = share;
  return NextResponse.json({
    trip: {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      days: trip.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        date: d.date,
        events: d.events.map((e) => ({
          id: e.id,
          title: e.title,
          location: e.location,
          description: e.description,
          category: e.category,
          eventTime: e.eventTime,
          durationMinutes: e.durationMinutes,
          sortOrder: e.sortOrder,
          lat: e.lat,
          lng: e.lng,
        })),
      })),
    },
  });
}
