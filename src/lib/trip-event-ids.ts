import { randomUUID } from "crypto";

import type { TripResponse } from "@/lib/schemas/trip.schema";

export function withFreshTripEventIds(aiResult: TripResponse): TripResponse {
  return {
    trip: {
      ...aiResult.trip,
      days: aiResult.trip.days.map((day) => ({
        ...day,
        events: day.events.map((event) => ({
          ...event,
          id: randomUUID(),
        })),
      })),
    },
  };
}
