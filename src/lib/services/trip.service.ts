import { generateTrip } from "@/lib/services/ai-generation.service";
import {
  createTripWithDays,
  replaceTripFromAi,
  getTripById,
  recordCompletedTripGeneration,
} from "@/lib/db/trip.repository";
import { TripInput } from "@/lib/schemas/trip.schema";

export async function createTrip(userId: string, input: TripInput) {
  const aiResult = await generateTrip(input);
  const trip = await createTripWithDays(userId, input, aiResult);
  return trip;
}

export async function regenerateTrip(userId: string, tripId: string, input: TripInput) {
  const aiResult = await generateTrip(input);
  await replaceTripFromAi(tripId, aiResult);
  await recordCompletedTripGeneration(tripId, userId, input);
  return getTripById(tripId, userId);
}
