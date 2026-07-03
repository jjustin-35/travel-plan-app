"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { EventCard } from "@/components/trip/EventCard";
import { EventContextMenu } from "@/components/trip/EventContextMenu";
import { AlternativesPanel } from "@/components/trip/AlternativesPanel";
import { useAlternativesStore, TripEvent } from "@/stores/alternatives.store";

type SortableEventProps = {
  event: TripEvent;
  isSelected: boolean;
  showMenu: boolean;
  onTap: (event: TripEvent) => void;
  onMenuAction: (action: string) => void;
  onMenuClose: () => void;
};

function SortableEvent({
  event,
  isSelected,
  showMenu,
  onTap,
  onMenuAction,
  onMenuClose,
}: SortableEventProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Long-press drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 text-wood/50"
      >
        <GripVertical size={16} />
      </div>

      <div className="pl-6">
        <EventCard event={event} onTap={onTap} isSelected={isSelected} />
      </div>

      {showMenu && (
        <EventContextMenu
          onAction={onMenuAction}
          onClose={onMenuClose}
        />
      )}
    </div>
  );
}

type DraggableTimelineProps = {
  tripId: string;
  dayId: string;
  dayNumber: number;
  dayDate: string;
  events: TripEvent[];
  onEventsChange: (dayId: string, events: TripEvent[]) => void;
  onEditEvent: (event: TripEvent) => void;
  onAddEvent: (dayNumber: number) => void;
};

export function DraggableTimeline({
  tripId,
  dayId,
  dayDate,
  events,
  onEventsChange,
  onEditEvent,
}: DraggableTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const alternativesStore = useAlternativesStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;

      const oldIndex = events.findIndex((ev) => ev.id === active.id);
      const newIndex = events.findIndex((ev) => ev.id === over.id);
      const reordered = arrayMove(events, oldIndex, newIndex).map(
        (ev, idx) => ({ ...ev, sortOrder: idx + 1 })
      );
      onEventsChange(dayId, reordered);
    },
    [events, dayId, onEventsChange]
  );

  const handleMenuAction = useCallback(
    async (action: string, event: TripEvent) => {
      if (action === "edit") {
        onEditEvent(event);
      } else if (action === "delete") {
        const updated = events
          .filter((e) => e.id !== event.id)
          .map((e, i) => ({ ...e, sortOrder: i + 1 }));
        onEventsChange(dayId, updated);
      } else if (action === "copy") {
        const copy = { ...event, id: crypto.randomUUID(), sortOrder: events.length + 1 };
        onEventsChange(dayId, [...events, copy]);
      } else if (action === "alternative") {
        alternativesStore.startLoading(event.id);
        try {
          const surroundingEvents = events
            .filter((e) => e.id !== event.id)
            .slice(Math.max(0, event.sortOrder - 2), event.sortOrder + 1);
          const res = await fetch(
            `/api/trips/${tripId}/events/${event.id}/alternatives`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event,
                context: { day_date: dayDate, surrounding_events: surroundingEvents },
              }),
            }
          );
          if (!res.ok) throw new Error("Failed to fetch alternatives");
          const data = await res.json();
          alternativesStore.setAlternatives(event.id, data.alternatives);
        } catch {
          alternativesStore.setError("目前無法產生備選，請稍後再試");
        }
      }
      setSelectedId(null);
    },
    [events, dayId, dayDate, tripId, onEventsChange, onEditEvent, alternativesStore]
  );

  const handleAlternativeSelect = useCallback(
    (alt: TripEvent) => {
      const eventId = alternativesStore.eventId;
      if (!eventId) return;
      const updated = events.map((e) =>
        e.id === eventId ? { ...alt, sortOrder: e.sortOrder } : e
      );
      onEventsChange(dayId, updated);
      alternativesStore.clear();
    },
    [events, dayId, alternativesStore, onEventsChange]
  );

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg width="110" height="92" viewBox="0 0 120 100" className="mb-4">
          <rect x="22" y="16" width="76" height="60" rx="10" fill="#F5E4C0" stroke="#D4B896" strokeWidth="2" />
          <rect x="22" y="40" width="76" height="6" fill="#D4B896" opacity="0.4" />
          <rect x="40" y="6" width="40" height="14" rx="6" fill="none" stroke="#D4B896" strokeWidth="2.5" />
          <rect x="48" y="30" width="24" height="16" rx="5" fill="#E97451" />
          <circle cx="60" cy="36" r="3" fill="white" opacity="0.6" />
          <circle cx="34" cy="80" r="6" fill="#D4956A" />
          <circle cx="86" cy="80" r="6" fill="#D4956A" />
        </svg>
        <p className="font-bold text-charcoal text-base">這天還沒有安排</p>
        <p className="text-xs text-muted mt-1">點擊右下角「+」開始規劃你的精彩行程</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Alternatives Panel */}
      {(alternativesStore.isLoading || alternativesStore.alternatives.length > 0 || alternativesStore.error) && (
        <AlternativesPanel onSelect={handleAlternativeSelect} />
      )}

      <div className="relative">
        {/* Vertical timeline line */}
        <div
          className="absolute left-[28px] top-4 bottom-4 w-0.5 rounded-full pointer-events-none"
          style={{ background: "linear-gradient(to bottom, #E97451, #F5C45A, #D4956A)" }}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={events.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-2">
                  {/* Timeline dot */}
                  <div className="w-9 flex flex-col items-center shrink-0 pt-5 z-10">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-coral bg-card">
                      <div className="h-1.5 w-1.5 rounded-full bg-coral" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <SortableEvent
                      event={event}
                      isSelected={selectedId === event.id}
                      showMenu={selectedId === event.id}
                      onTap={(e) => setSelectedId((prev) => (prev === e.id ? null : e.id))}
                      onMenuAction={(action) => handleMenuAction(action, event)}
                      onMenuClose={() => setSelectedId(null)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
