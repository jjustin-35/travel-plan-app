"use client";

import { useEffect, useRef, useState } from "react";
import {
  cacheTrip,
  getCachedTrip,
  queueSync,
  getAllPendingSyncs,
  resolveSync,
  CachedTrip,
} from "@/lib/db/idb";
import { buildTripPatchBody } from "@/lib/trip-patch";

type TripEvent = {
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

type TripDay = {
  id: string;
  dayNumber: number;
  date: string;
  events: TripEvent[];
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  status: string;
  version: number;
  startDate?: string;
  endDate?: string;
  days: TripDay[];
};

type UseOfflineSyncOptions = {
  tripId: string;
  trip: Trip | null;
};

type UseOfflineSyncReturn = {
  isOnline: boolean;
  hasPendingSync: boolean;
  saveEventsOffline: (dayId: string, events: TripEvent[]) => Promise<void>;
  markEventsSynced: (dayId: string, version: number) => Promise<void>;
};

export function useOfflineSync({
  tripId,
  trip,
}: UseOfflineSyncOptions): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const isSyncingRef = useRef(false);
  const tripVersionRef = useRef(1);

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cache trip to IndexedDB whenever server data arrives
  useEffect(() => {
    if (!trip) return;
    tripVersionRef.current = trip.version ?? 1;
    cacheTrip({
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      status: trip.status,
      startDate: trip.startDate ?? "",
      endDate: trip.endDate ?? "",
      version: trip.version ?? 1,
      days: trip.days,
    }).catch(console.error);
  }, [trip]);

  // When coming back online, flush pending syncs
  useEffect(() => {
    if (!isOnline || isSyncingRef.current) return;

    const flush = async () => {
      isSyncingRef.current = true;
      try {
        const pending = await getAllPendingSyncs();
        const mine = pending.filter((p) => p.tripId === tripId);
        if (mine.length === 0) {
          setHasPendingSync(false);
          return;
        }

        let cached = await getCachedTrip(tripId);
        if (!cached) {
          setHasPendingSync(true);
          return;
        }

        let clientVersion = cached.version;

        for (const sync of mine) {
          try {
            const day = cached?.days.find((d) => d.id === sync.dayId);
            if (!day) continue;

            const res = await fetch(`/api/trips/${sync.tripId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                buildTripPatchBody(clientVersion, day.dayNumber, sync.events)
              ),
            });
            if (res.ok) {
              clientVersion += 1;
              tripVersionRef.current = clientVersion;
              await resolveSync(sync.tripId, sync.dayId);
              cached = { ...cached, version: clientVersion };
              await cacheTrip(cached);
            }
          } catch {
            // Stay queued, will retry next time online
          }
        }

        const remaining = await getAllPendingSyncs();
        setHasPendingSync(remaining.some((p) => p.tripId === tripId));
      } finally {
        isSyncingRef.current = false;
      }
    };

    flush();
  }, [isOnline, tripId]);

  // Save events to IDB (and queue for sync if offline)
  const saveEventsOffline = async (dayId: string, events: TripEvent[]) => {
    // Update IDB cache immediately
    const cached = await getCachedTrip(tripId);
    if (cached) {
      const updatedDays = cached.days.map((d: TripDay) =>
        d.id === dayId ? { ...d, events } : d
      );
      await cacheTrip({ ...cached, days: updatedDays });
    }
    // Queue for remote sync
    await queueSync(tripId, dayId, events);
    setHasPendingSync(true);
  };

  const markEventsSynced = async (dayId: string, version: number) => {
    await resolveSync(tripId, dayId);
    tripVersionRef.current = version;

    const cached = await getCachedTrip(tripId);
    if (cached) {
      await cacheTrip({ ...cached, version });
    }

    const remaining = await getAllPendingSyncs();
    setHasPendingSync(remaining.some((p) => p.tripId === tripId));
  };

  return { isOnline, hasPendingSync, saveEventsOffline, markEventsSynced };
}

// Standalone hook for loading cached trips when offline
export async function loadCachedTripFallback(
  tripId: string
): Promise<CachedTrip | null> {
  return (await getCachedTrip(tripId)) ?? null;
}
