import { generateTrip } from "@/lib/services/ai-generation.service";
import {
  createTripWithDays,
  getTripsByUser,
  getTripById,
  updateTripEvents,
  deleteTripById,
} from "@/lib/db/trip.repository";
import { TripInput } from "@/lib/schemas/trip.schema";

export async function createTrip(userId: string, input: TripInput) {
  const aiResult = await generateTrip(input);
  const trip = await createTripWithDays(userId, input, aiResult);
  return trip;
}

export async function listTrips(userId: string) {
  return await getTripsByUser(userId);
}

export async function getTrip(tripId: string, userId: string) {
  return await getTripById(tripId, userId);
}

export async function patchTrip(
  tripId: string,
  userId: string,
  clientVersion: number,
  clientModifiedAt: string,
  days: Parameters<typeof updateTripEvents>[4]
) {
  return await updateTripEvents(
    tripId,
    userId,
    clientVersion,
    clientModifiedAt,
    days
  );
}

export async function deleteTrip(tripId: string, userId: string) {
  return await deleteTripById(tripId, userId);
}
