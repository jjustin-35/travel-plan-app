import type { TripInput } from "@/lib/schemas/trip.schema";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const tripKeys = {
  all: ["trips"] as const,
  detail: (id: string) => ["trip", id] as const,
};

export const TRIPS_QUERY_KEY = tripKeys.all;

export type TripListItem = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
  tripType: string;
  status: string;
};

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return fallback;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  fallbackError = "Request failed"
): Promise<T> {
  const res = await fetch(path, init);
  const body = await readJson(res);
  if (!res.ok) {
    throw new ApiError(errorMessage(body, fallbackError), res.status, body);
  }
  return body as T;
}

function normalizeListItem(trip: TripListItem): TripListItem {
  return {
    ...trip,
    startDate:
      typeof trip.startDate === "string"
        ? trip.startDate
        : String(trip.startDate),
    endDate:
      typeof trip.endDate === "string" ? trip.endDate : String(trip.endDate),
  };
}

export async function listTrips(): Promise<TripListItem[]> {
  const data = await request<{ trips: TripListItem[] }>(
    "/api/trips",
    undefined,
    "Failed to load trips"
  );
  return data.trips.map(normalizeListItem);
}

export async function getTrip<T = unknown>(id: string): Promise<T> {
  const data = await request<{ trip: T }>(
    `/api/trips/${id}`,
    undefined,
    "Failed to fetch trip"
  );
  return data.trip;
}

export async function createTrip(input: TripInput): Promise<{
  trip?: { id: string };
  jobId?: string;
}> {
  return request(
    "/api/trips",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to create trip"
  );
}

export async function deleteTrip(id: string): Promise<void> {
  await request(
    `/api/trips/${id}`,
    { method: "DELETE" },
    "Failed to delete trip"
  );
}

export async function patchTrip(
  id: string,
  body: unknown
): Promise<{ ok: true } | { conflict: true; currentVersion?: number }> {
  const res = await fetch(`/api/trips/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJson(res);

  if (res.status === 409) {
    const currentVersion =
      data &&
      typeof data === "object" &&
      "currentVersion" in data &&
      typeof (data as { currentVersion: unknown }).currentVersion === "number"
        ? (data as { currentVersion: number }).currentVersion
        : undefined;
    return { conflict: true, currentVersion };
  }

  if (!res.ok) {
    throw new ApiError(errorMessage(data, "Failed to update trip"), res.status, data);
  }

  return { ok: true };
}

export async function regenerateTrip(id: string): Promise<void> {
  await request(
    `/api/trips/${id}/regenerate`,
    { method: "POST" },
    "Failed to regenerate trip"
  );
}

export type TripShareLink = {
  id: string;
  shareToken: string;
  permission: string;
  createdAt: string;
  isActive: boolean;
};

export async function listShares(tripId: string): Promise<TripShareLink[]> {
  const data = await request<{ shares: TripShareLink[] }>(
    `/api/trips/${tripId}/shares`,
    undefined,
    "Failed to load shares"
  );
  return data.shares;
}

export async function createShare(tripId: string): Promise<TripShareLink> {
  const data = await request<{ share: TripShareLink }>(
    `/api/trips/${tripId}/shares`,
    { method: "POST" },
    "Failed to create share"
  );
  return data.share;
}

export async function deleteShare(
  tripId: string,
  shareId: string
): Promise<void> {
  await request(
    `/api/trips/${tripId}/shares/${shareId}`,
    { method: "DELETE" },
    "Failed to delete share"
  );
}
