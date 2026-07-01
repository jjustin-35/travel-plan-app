"use client";

import { EventCard } from "@/components/trip/EventCard";

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

type TimelineViewProps = {
  days: TripDay[];
  activeDay: number;
  onDayChange: (day: number) => void;
  onEventTap?: (event: TripEvent) => void;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
}

export function TimelineView({
  days,
  activeDay,
  onDayChange,
  onEventTap,
}: TimelineViewProps) {
  const currentDay = days.find((d) => d.dayNumber === activeDay);

  return (
    <div className="flex flex-col h-full">
      {/* Day Tabs */}
      <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-border bg-white">
        {days.map((day) => (
          <button
            key={day.dayNumber}
            onClick={() => onDayChange(day.dayNumber)}
            className={[
              "flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all",
              activeDay === day.dayNumber
                ? "bg-coral text-white"
                : "bg-butter text-charcoal hover:bg-wood-light",
            ].join(" ")}
          >
            <div>Day {day.dayNumber}</div>
            <div className="font-normal opacity-80">{formatDate(day.date)}</div>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {!currentDay || currentDay.events.length === 0 ? (
          <EmptyDayState />
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />

            <div className="flex flex-col gap-4">
              {currentDay.events.map((event, index) => (
                <div key={event.id} className="flex gap-3 items-start">
                  {/* Timeline dot + time */}
                  <div className="flex flex-col items-center flex-shrink-0 w-10 pt-3.5">
                    <div className="w-3 h-3 rounded-full bg-coral border-2 border-white shadow-sm z-10" />
                    {index < currentDay.events.length - 1 && (
                      <div className="text-xs text-muted mt-1 text-center leading-tight" />
                    )}
                  </div>

                  {/* Event card */}
                  <div className="flex-1 min-w-0">
                    <EventCard
                      event={event}
                      onTap={onEventTap}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyDayState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4">🗺️</div>
      <p className="font-semibold text-charcoal">這天還沒有安排</p>
      <p className="text-sm text-muted mt-1">點擊 + 開始規劃</p>
    </div>
  );
}
