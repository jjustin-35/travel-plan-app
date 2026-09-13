import { generateTrip } from "@/lib/services/ai-generation.service";
import {
  createTripWithDays,
  getTripsByUser,
  getTripById,
  updateTripEvents,
  deleteTripById,
} from "@/lib/db/trip.repository";
import { TripInput } from "@/lib/schemas/trip.schema";

const DEFAULT_TRIP_CREATION_TIMEOUT_MS = 45_000;

export class TripCreationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripCreationTimeoutError";
  }
}

function getTripCreationTimeoutMs(): number {
  const configured = Number(process.env.TRIP_CREATION_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TRIP_CREATION_TIMEOUT_MS;
}

function withTripCreationTimeout<T>(promise: Promise<T>): Promise<T> {
  const timeoutMs = getTripCreationTimeoutMs();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new TripCreationTimeoutError(
          `Trip creation AI generation timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export async function createTrip(userId: string, input: TripInput) {
  const aiResult = await withTripCreationTimeout(generateTrip(input));
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
