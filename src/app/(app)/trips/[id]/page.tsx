"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TimelineView } from "@/components/trip/TimelineView";
import { LoadingAnimation } from "@/components/trip/LoadingAnimation";
import { EditEventModal } from "@/components/trip/EditEventModal";
import { RippleButton } from "@/components/ui/RippleButton";
import { AddFab } from "@/components/ui/AddFab";
import { ArrowLeft, RefreshCw, Share2, WifiOff, RefreshCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { buildTripPatchBody } from "@/lib/trip-patch";
import type { TripEvent } from "@/lib/schemas/trip.schema";

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
  days: TripDay[];
};

async function fetchTrip(id: string): Promise<Trip> {
  const res = await fetch(`/api/trips/${id}`);
  if (!res.ok) throw new Error("Failed to fetch trip");
  const data = await res.json();
  return data.trip;
}

async function batchUpdateEvents(
  tripId: string,
  clientVersion: number,
  dayNumber: number,
  events: TripEvent[]
) {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTripPatchBody(clientVersion, dayNumber, events)),
  });
  return res;
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeDay, setActiveDay] = useState(1);
  const [localDays, setLocalDays] = useState<TripDay[]>([]);
  const [editingEvent, setEditingEvent] = useState<TripEvent | null>(null);
  const [addingForDay, setAddingForDay] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const localDaysRef = useRef<TripDay[]>([]);
  const tripVersionRef = useRef(1);

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id),
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 3000 : false,
  });

  // Sync server data → local state
  useEffect(() => {
    if (trip?.days) {
      const days = trip.days.map((d) => ({
        ...d,
        date: new Date(d.date).toISOString().split("T")[0],
      }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalDays(days);
      localDaysRef.current = days;
      tripVersionRef.current = trip.version ?? 1;
    }
  }, [trip]);

  // Offline sync integration
  const { isOnline, hasPendingSync, saveEventsOffline } = useOfflineSync({
    tripId: id,
    trip: trip ?? null,
  });

  // Supabase Realtime: subscribe to trip status changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trips",
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["trip", id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  /** Debounced batch update for a given day */
  const scheduleBatchUpdate = useCallback(
    (dayId: string, events: TripEvent[]) => {
      const existing = debounceTimers.current.get(dayId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(async () => {
        debounceTimers.current.delete(dayId);
        const day = localDaysRef.current.find((d) => d.id === dayId);
        if (!day) return;

        setIsSaving(true);
        try {
          const res = await batchUpdateEvents(
            id,
            tripVersionRef.current,
            day.dayNumber,
            events
          );
          if (res.ok) {
            tripVersionRef.current += 1;
            queryClient.invalidateQueries({ queryKey: ["trip", id] });
          } else {
            console.error("Failed to save trip events", await res.text());
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsSaving(false);
        }
      }, 800);
      debounceTimers.current.set(dayId, timer);
    },
    [id, queryClient]
  );

  const handleEventsChange = useCallback(
    (dayId: string, events: TripEvent[]) => {
      setLocalDays((prev) => {
        const next = prev.map((d) => (d.id === dayId ? { ...d, events } : d));
        localDaysRef.current = next;
        return next;
      });
      // Write to IDB immediately, then debounce remote sync
      saveEventsOffline(dayId, events).catch(console.error);
      scheduleBatchUpdate(dayId, events);
    },
    [scheduleBatchUpdate, saveEventsOffline]
  );

  const handleEditEvent = useCallback((event: TripEvent) => {
    setEditingEvent(event);
  }, []);

  const handleAddEvent = useCallback((dayNumber: number) => {
    setAddingForDay(dayNumber);
  }, []);

  const handleSaveEvent = useCallback(
    (saved: TripEvent) => {
      const isNew = addingForDay !== null;
      const targetDayNumber = isNew ? addingForDay! : activeDay;
      const targetDay = localDays.find((d) => d.dayNumber === targetDayNumber);
      if (!targetDay) return;

      let updatedEvents: TripEvent[];
      if (isNew) {
        const sortOrder = targetDay.events.length + 1;
        const isFirst = sortOrder === 1;
        updatedEvents = [
          ...targetDay.events,
          {
            ...saved,
            sortOrder,
            travelFromMode: isFirst ? null : saved.travelFromMode,
            travelFromMinutes: isFirst ? null : saved.travelFromMinutes,
          },
        ];
      } else {
        updatedEvents = targetDay.events.map((e) =>
          e.id === saved.id ? saved : e
        );
      }

      handleEventsChange(targetDay.id, updatedEvents);
      setEditingEvent(null);
      setAddingForDay(null);
    },
    [localDays, addingForDay, activeDay, handleEventsChange]
  );

  if (isLoading || trip?.status === "generating") {
    return <LoadingAnimation destination={trip?.destination} />;
  }

  if (isError || !trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="font-semibold text-charcoal">找不到行程</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-coral text-sm font-medium"
        >
          返回首頁
        </button>
      </div>
    );
  }

  if (trip.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="font-semibold text-charcoal">行程生成失敗</p>
        <p className="text-sm text-muted mt-1">請點擊重新生成</p>
        <button
          onClick={async () => {
            await fetch(`/api/trips/${id}/regenerate`, { method: "POST" });
            queryClient.invalidateQueries({ queryKey: ["trip", id] });
          }}
          className="mt-4 bg-coral text-white px-6 py-2 rounded-full text-sm font-medium"
        >
          重新生成
        </button>
      </div>
    );
  }

  const addDay =
    addingForDay !== null
      ? localDays.find((d) => d.dayNumber === addingForDay)
      : undefined;
  const newEventDraft: TripEvent | null =
    addDay && addingForDay !== null
      ? {
          id: crypto.randomUUID(),
          title: "",
          location: "",
          description: "",
          category: "景點",
          eventTime: "09:00",
          durationMinutes: 90,
          sortOrder: addDay.events.length + 1,
          lat: 0,
          lng: 0,
          travelFromMode: addDay.events.length === 0 ? null : "步行",
          travelFromMinutes: addDay.events.length === 0 ? null : 15,
        }
      : null;

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Offline / pending sync banner */}
      {(!isOnline || hasPendingSync) && (
        <div
          className={[
            "flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium",
            !isOnline
              ? "bg-amber-100 text-amber-700"
              : "bg-blue-50 text-blue-600",
          ].join(" ")}
        >
          {!isOnline ? (
            <>
              <WifiOff size={13} /> 離線模式 — 變更將在上線後同步
            </>
          ) : (
            <>
              <RefreshCcw size={13} className="animate-spin" /> 同步中…
            </>
          )}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <RippleButton
            onClick={() => router.push("/")}
            rippleColor="rgba(160,120,80,0.15)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border text-charcoal hover:bg-butter transition-colors"
          >
            <ArrowLeft size={18} />
          </RippleButton>
          <div className="min-w-0">
            <h1 className="font-extrabold text-charcoal text-sm leading-tight truncate">
              {trip.title}
            </h1>
            <p className="text-xs text-muted truncate">{trip.destination}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isSaving && (
            <span className="text-xs text-muted animate-pulse px-1">儲存中…</span>
          )}
          <RippleButton
            onClick={async () => {
              await fetch(`/api/trips/${id}/regenerate`, { method: "POST" });
              queryClient.invalidateQueries({ queryKey: ["trip", id] });
            }}
            rippleColor="rgba(233,116,81,0.18)"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-coral/30 bg-coral/5 text-coral hover:bg-coral/10 transition-colors"
            title="重新產生行程"
          >
            <RefreshCw size={16} />
          </RippleButton>
          <RippleButton
            onClick={() => router.push(`/trips/${id}/share`)}
            rippleColor="rgba(160,120,80,0.15)"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border text-muted hover:text-coral hover:bg-butter transition-colors"
            title="分享行程"
          >
            <Share2 size={16} />
          </RippleButton>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <TimelineView
          tripId={id}
          days={localDays}
          activeDay={activeDay}
          onDayChange={setActiveDay}
          onEventsChange={handleEventsChange}
          onEditEvent={handleEditEvent}
          onAddEvent={handleAddEvent}
        />
      </div>

      {/* FAB: Add event */}
      <AddFab onClick={() => handleAddEvent(activeDay)} title="新增行程節點" />

      {/* Edit / Create Event Modal */}
      {(editingEvent !== null || addingForDay !== null) && (
        <EditEventModal
          event={editingEvent ?? newEventDraft}
          isNew={addingForDay !== null}
          onSave={handleSaveEvent}
          onClose={() => {
            setEditingEvent(null);
            setAddingForDay(null);
          }}
        />
      )}
    </div>
  );
}
