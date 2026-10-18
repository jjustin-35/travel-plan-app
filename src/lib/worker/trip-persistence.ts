import { prisma } from "../db/prisma";
import type { TripResponse } from "../schemas/trip.schema";

export async function tripExists(tripId: string): Promise<boolean> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true },
  });

  return trip !== null;
}

export async function saveTripResult(
  tripId: string,
  aiResult: TripResponse
): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.trip.updateMany({
      where: { id: tripId },
      data: {
        title: aiResult.trip.title,
        status: "ready",
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return false;
    }

    await tx.tripDay.deleteMany({ where: { tripId } });

    for (const day of aiResult.trip.days) {
      const tripDay = await tx.tripDay.create({
        data: {
          tripId,
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

    return true;
  });
}

export async function markTripGenerationFailed(
  tripId: string,
  errorMessage: string
): Promise<void> {
  await prisma.$transaction([
    prisma.trip.updateMany({
      where: { id: tripId },
      data: { status: "failed" },
    }),
    prisma.aIGenerationJob.updateMany({
      where: { tripId, status: "processing" },
      data: { status: "failed", errorMessage },
    }),
  ]);
}
