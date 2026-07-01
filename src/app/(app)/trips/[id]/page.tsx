"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TimelineView } from "@/components/trip/TimelineView";
import { LoadingAnimation } from "@/components/trip/LoadingAnimation";
import { EditEventModal } from "@/components/trip/EditEventModal";
import { createClient } from "@/lib/supabase/client";

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
  dayId: string,
  events: TripEvent[]
) {
  await fetch(`/api/trips/${tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayId, events }),
  });
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

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id),
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 3000 : false,
  });

  // Sync server data → local state (skip while user is editing)
  useEffect(() => {
    if (trip?.days) {
      const days = trip.days.map((d) => ({
        ...d,
        date: new Date(d.date).toISOString().split("T")[0],
      }));
      setLocalDays(days);
    }
  }, [trip]);

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
        setIsSaving(true);
        await batchUpdateEvents(id, dayId, events).catch(console.error);
        setIsSaving(false);
      }, 800);
      debounceTimers.current.set(dayId, timer);
    },
    [id]
  );

  const handleEventsChange = useCallback(
    (dayId: string, events: TripEvent[]) => {
      setLocalDays((prev) =>
        prev.map((d) => (d.id === dayId ? { ...d, events } : d))
      );
      scheduleBatchUpdate(dayId, events);
    },
    [scheduleBatchUpdate]
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
        updatedEvents = [
          ...targetDay.events,
          { ...saved, sortOrder: targetDay.events.length + 1 },
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
    return <LoadingAnimation />;
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

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="p-1 -ml-1 text-charcoal hover:text-coral transition-colors text-lg"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-charcoal text-sm leading-tight">
              {trip.title}
            </h1>
            <p className="text-xs text-muted">{trip.destination}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSaving && (
            <span className="text-xs text-muted animate-pulse px-1">儲存中…</span>
          )}
          <button
            onClick={async () => {
              await fetch(`/api/trips/${id}/regenerate`, { method: "POST" });
              queryClient.invalidateQueries({ queryKey: ["trip", id] });
            }}
            className="p-2 text-muted hover:text-coral transition-colors rounded-xl hover:bg-butter"
            title="重新產生行程"
          >
            🔄
          </button>
          <button
            onClick={() => router.push(`/trips/${id}/share`)}
            className="p-2 text-muted hover:text-coral transition-colors rounded-xl hover:bg-butter"
            title="分享行程"
          >
            🔗
          </button>
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
      <button
        onClick={() => handleAddEvent(activeDay)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-coral text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-wood transition-all active:scale-95 z-40"
        title="新增行程節點"
      >
        +
      </button>

      {/* Edit / Create Event Modal */}
      {(editingEvent !== null || addingForDay !== null) && (
        <EditEventModal
          event={editingEvent}
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
