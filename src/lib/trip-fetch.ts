import { getCachedTrip, type CachedTrip } from "@/lib/db/idb";

export type TripEvent = {
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
};

export type TripDay = {
  id: string;
  dayNumber: number;
  date: string;
  events: TripEvent[];
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  status: string;
  version: number;
  startDate?: string;
  endDate?: string;
  days: TripDay[];
};

function cachedTripToTrip(cached: CachedTrip): Trip {
  return {
    id: cached.id,
    title: cached.title,
    destination: cached.destination,
    status: cached.status,
    version: cached.version,
    startDate: cached.startDate,
    endDate: cached.endDate,
    days: cached.days,
  };
}

async function loadCachedTripOrThrow(
  tripId: string,
  originalError: unknown
): Promise<Trip> {
  try {
    const cached = await getCachedTrip(tripId);
    if (cached) return cachedTripToTrip(cached);
  } catch (cacheError) {
    console.error("Failed to load cached trip fallback", cacheError);
  }

  if (originalError instanceof Error) throw originalError;
  throw new Error("Failed to fetch trip");
}

export async function fetchTrip(id: string): Promise<Trip> {
  let res: Response;

  try {
    res = await fetch(`/api/trips/${id}`);
  } catch (error) {
    return loadCachedTripOrThrow(id, error);
  }

  if (!res.ok) {
    const error = new Error(`Failed to fetch trip: ${res.status}`);
    if (res.status >= 500) return loadCachedTripOrThrow(id, error);
    throw error;
  }

  const data = (await res.json()) as { trip: Trip };
  return data.trip;
}
