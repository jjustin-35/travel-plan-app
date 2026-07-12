import { prisma } from "@/lib/db/prisma";
import { TripResponse, TripInput } from "@/lib/schemas/trip.schema";

export async function createTripWithDays(
  userId: string,
  input: TripInput,
  aiResult: TripResponse
) {
  const { trip: aiTrip } = aiResult;

  return await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        userId,
        title: aiTrip.title,
        destination: input.destination,
        peopleCount: input.peopleCount,
        tripType: input.tripType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "ready",
      },
    });

    for (const day of aiTrip.days) {
      const tripDay = await tx.tripDay.create({
        data: {
          tripId: trip.id,
          dayNumber: day.day,
          date: new Date(day.date),
        },
      });

      await tx.tripEvent.createMany({
        data: day.events.map((event) => ({
          id: event.id,
          tripDayId: tripDay.id,
          title: event.title,
          location: event.location,
          description: event.description,
          category: event.category,
          eventTime: event.event_time,
          durationMinutes: event.duration_minutes,
          sortOrder: event.sort_order,
          lat: event.lat,
          lng: event.lng,
        })),
      });
    }

    return trip;
  });
}

export async function getTripsByUser(userId: string) {
  return await prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      title: true,
      destination: true,
      startDate: true,
      endDate: true,
      peopleCount: true,
      tripType: true,
      status: true,
    },
  });
}

export async function getTripById(tripId: string, userId: string) {
  return await prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: {
          events: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
}

export async function updateTripEvents(
  tripId: string,
  userId: string,
  clientVersion: number,
  _clientModifiedAt: string,
  days: Array<{
    dayNumber: number;
    events: Array<{
      id: string;
      title: string;
      location: string;
      description: string;
      category: string;
      eventTime: string;
      durationMinutes: number;
      sortOrder: number;
      lat: number;
      lng: number;
    }>;
  }>
) {
  return await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findFirst({
      where: { id: tripId, userId },
      select: { id: true, version: true },
    });

    if (!trip) throw new Error("Trip not found");

    if (clientVersion !== trip.version) {
      return { conflict: true, currentVersion: trip.version };
    }

    const tripDays = await tx.tripDay.findMany({
      where: { tripId },
      select: { id: true, dayNumber: true },
    });

    const dayMap = new Map(tripDays.map((d) => [d.dayNumber, d.id]));
    const missingDay = days.find((day) => !dayMap.has(day.dayNumber));
    if (missingDay) {
      return { conflict: true, currentVersion: trip.version };
    }

    for (const day of days) {
      const dayId = dayMap.get(day.dayNumber)!;

      await tx.tripEvent.deleteMany({ where: { tripDayId: dayId } });
      await tx.tripEvent.createMany({
        data: day.events.map((e) => ({
          id: e.id,
          tripDayId: dayId,
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
      });
    }

    await tx.trip.update({
      where: { id: tripId },
      data: {
        version: { increment: 1 },
      },
    });

    return { conflict: false };
  });
}

export async function deleteTripById(tripId: string, userId: string) {
  return await prisma.trip.deleteMany({
    where: { id: tripId, userId },
  });
}
