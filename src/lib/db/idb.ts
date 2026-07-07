import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { TripEvent } from "@/lib/schemas/trip.schema";

type TripDay = {
  id: string;
  dayNumber: number;
  date: string;
  events: TripEvent[];
};

export type CachedTrip = {
  id: string;
  title: string;
  destination: string;
  status: string;
  startDate: string;
  endDate: string;
  version: number;
  days: TripDay[];
  cachedAt: number;
};

export type PendingSync = {
  id: string;
  tripId: string;
  dayId: string;
  events: TripEvent[];
  updatedAt: number;
};

interface TravelDB extends DBSchema {
  trips: {
    key: string;
    value: CachedTrip;
    indexes: { "by-cachedAt": number };
  };
  pending_syncs: {
    key: string;
    value: PendingSync;
    indexes: { "by-tripId": string };
  };
}

const DB_NAME = "travel-plan-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TravelDB>> | null = null;

function getDb(): Promise<IDBPDatabase<TravelDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TravelDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const tripStore = db.createObjectStore("trips", { keyPath: "id" });
        tripStore.createIndex("by-cachedAt", "cachedAt");

        const syncStore = db.createObjectStore("pending_syncs", { keyPath: "id" });
        syncStore.createIndex("by-tripId", "tripId");
      },
    });
  }
  return dbPromise;
}

// Save trip to IndexedDB (cache)
export async function cacheTrip(trip: Omit<CachedTrip, "cachedAt">): Promise<void> {
  const db = await getDb();
  await db.put("trips", { ...trip, cachedAt: Date.now() });
}

// Get cached trip
export async function getCachedTrip(tripId: string): Promise<CachedTrip | undefined> {
  const db = await getDb();
  return db.get("trips", tripId);
}

// Get all cached trips
export async function getAllCachedTrips(): Promise<CachedTrip[]> {
  const db = await getDb();
  return db.getAllFromIndex("trips", "by-cachedAt");
}

// Delete cached trip
export async function deleteCachedTrip(tripId: string): Promise<void> {
  const db = await getDb();
  await db.delete("trips", tripId);
}

// Queue a pending sync
export async function queueSync(
  tripId: string,
  dayId: string,
  events: TripEvent[]
): Promise<void> {
  const db = await getDb();
  const key = `${tripId}__${dayId}`;
  await db.put("pending_syncs", {
    id: key,
    tripId,
    dayId,
    events,
    updatedAt: Date.now(),
  });
}

// Get all pending syncs
export async function getAllPendingSyncs(): Promise<PendingSync[]> {
  const db = await getDb();
  return db.getAll("pending_syncs");
}

// Remove a resolved sync
export async function resolveSync(tripId: string, dayId: string): Promise<void> {
  const db = await getDb();
  await db.delete("pending_syncs", `${tripId}__${dayId}`);
}
