"use client";

import { DraggableTimeline } from "@/components/trip/DraggableTimeline";
import { formatDateOnly } from "@/lib/date-format";
import type { TripEvent } from "@/lib/schemas/trip.schema";

type TripDay = {
  id: string;
  dayNumber: number;
  date: string;
  events: TripEvent[];
};

type TimelineViewProps = {
  tripId: string;
  days: TripDay[];
  activeDay: number;
  onDayChange: (day: number) => void;
  onEventsChange: (dayId: string, events: TripEvent[]) => void;
  onEditEvent: (event: TripEvent) => void;
  onAddEvent: (dayNumber: number) => void;
};

function formatDate(dateStr: string): string {
  return formatDateOnly(dateStr);
}

export function TimelineView({
  tripId,
  days,
  activeDay,
  onDayChange,
  onEventsChange,
  onEditEvent,
  onAddEvent,
}: TimelineViewProps) {
  const currentDay = days.find((d) => d.dayNumber === activeDay);

  return (
    <div className="flex flex-col h-full">
      {/* Day Tabs */}
      <div className="no-scrollbar flex overflow-x-auto gap-2 px-4 py-3 border-b border-border bg-card">
        {days.map((day) => (
          <button
            key={day.dayNumber}
            onClick={() => onDayChange(day.dayNumber)}
            className={[
              "shrink-0 px-4 py-2 rounded-2xl text-xs font-bold transition-all",
              activeDay === day.dayNumber
                ? "bg-coral text-white shadow-md shadow-coral/25"
                : "bg-butter text-muted hover:bg-wood-light",
            ].join(" ")}
          >
            <div>Day {day.dayNumber}</div>
            <div className="font-medium opacity-80">{formatDate(day.date)}</div>
          </button>
        ))}
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        {currentDay ? (
          <DraggableTimeline
            key={currentDay.id}
            tripId={tripId}
            dayId={currentDay.id}
            dayNumber={currentDay.dayNumber}
            dayDate={currentDay.date}
            events={currentDay.events}
            onEventsChange={onEventsChange}
            onEditEvent={onEditEvent}
            onAddEvent={onAddEvent}
          />
        ) : null}
      </div>
    </div>
  );
}
