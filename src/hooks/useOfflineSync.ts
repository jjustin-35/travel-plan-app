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
    cacheTrip({
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      status: trip.status,
      startDate: trip.startDate ?? "",
      endDate: trip.endDate ?? "",
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

        await Promise.all(
          mine.map(async (sync) => {
            try {
              const res = await fetch(`/api/trips/${sync.tripId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dayId: sync.dayId,
                  events: sync.events,
                }),
              });
              if (res.ok) await resolveSync(sync.tripId, sync.dayId);
            } catch {
              // Stay queued, will retry next time online
            }
          })
        );

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

  return { isOnline, hasPendingSync, saveEventsOffline };
}

// Standalone hook for loading cached trips when offline
export async function loadCachedTripFallback(
  tripId: string
): Promise<CachedTrip | null> {
  return (await getCachedTrip(tripId)) ?? null;
}
