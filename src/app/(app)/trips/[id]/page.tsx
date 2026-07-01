"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { TimelineView } from "@/components/trip/TimelineView";
import { LoadingAnimation } from "@/components/trip/LoadingAnimation";

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

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeDay, setActiveDay] = useState(1);

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id),
    refetchInterval: (query) => {
      return query.state.data?.status === "generating" ? 3000 : false;
    },
  });

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

  const days = trip.days.map((d) => ({
    ...d,
    date: new Date(d.date).toISOString().split("T")[0],
    events: d.events.map((e) => ({
      ...e,
      eventTime: e.eventTime,
    })),
  }));

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="p-1 -ml-1 text-charcoal hover:text-coral transition-colors"
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

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await fetch(`/api/trips/${id}/regenerate`, { method: "POST" });
              router.refresh();
            }}
            className="text-xs text-muted hover:text-coral transition-colors px-2 py-1"
            title="重新產生行程"
          >
            🔄
          </button>
          <button
            onClick={() => router.push(`/trips/${id}/share`)}
            className="text-xs text-muted hover:text-coral transition-colors px-2 py-1"
            title="分享行程"
          >
            🔗
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <TimelineView
          days={days}
          activeDay={activeDay}
          onDayChange={setActiveDay}
        />
      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-6 w-14 h-14 bg-coral text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-wood transition-colors">
        +
      </button>
    </div>
  );
}
