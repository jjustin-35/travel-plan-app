import type { TripInput } from "@/lib/schemas/trip.schema";
import { calculateTripDuration } from "@/lib/trip-duration";

type ExistingTripForRegenerateInput = {
  destination: string;
  startDate: Date;
  endDate: Date;
  peopleCount: number;
  tripType: string;
};

export function buildDefaultRegenerateInput(
  existing: ExistingTripForRegenerateInput
): TripInput {
  const duration = calculateTripDuration(existing.startDate, existing.endDate);

  return {
    destination: existing.destination,
    startDate: existing.startDate.toISOString().split("T")[0],
    endDate: existing.endDate.toISOString().split("T")[0],
    days: duration.days,
    nights: duration.nights,
    peopleCount: existing.peopleCount,
    tripType: existing.tripType,
  };
}
