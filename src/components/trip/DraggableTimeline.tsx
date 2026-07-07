"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EventCard } from "@/components/trip/EventCard";
import { EventDetailModal } from "@/components/trip/EventDetailModal";
import { TravelLegConnector } from "@/components/trip/TravelLegConnector";
import { AlternativesPanel } from "@/components/trip/AlternativesPanel";
import { useAlternativesStore } from "@/stores/alternatives.store";
import type { TripEvent } from "@/lib/schemas/trip.schema";

const LONG_PRESS_MS = 450;

type SortableEventProps = {
  event: TripEvent;
  dragJustEnded: boolean;
  onTap: (event: TripEvent) => void;
};

function SortableEvent({ event, dragJustEnded, onTap }: SortableEventProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleClick = () => {
    if (dragJustEnded) return;
    onTap(event);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-manipulation"
    >
      <EventCard event={event} onTap={handleClick} isDragging={isDragging} />
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
  dayId,
  events,
  onEventsChange,
  onEditEvent,
}: DraggableTimelineProps) {
  const [detailEvent, setDetailEvent] = useState<TripEvent | null>(null);
  const [dragJustEnded, setDragJustEnded] = useState(false);
  const alternativesStore = useAlternativesStore();
  const dragJustEndedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((_e: DragStartEvent) => {
    if (dragJustEndedTimer.current) {
      clearTimeout(dragJustEndedTimer.current);
      dragJustEndedTimer.current = null;
    }
    setDragJustEnded(false);
    setDetailEvent(null);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;

      if (over && active.id !== over.id) {
        const oldIndex = events.findIndex((ev) => ev.id === active.id);
        const newIndex = events.findIndex((ev) => ev.id === over.id);
        const reordered = arrayMove(events, oldIndex, newIndex).map(
          (ev, idx) => ({
            ...ev,
            sortOrder: idx + 1,
            travelFromMode: idx === 0 ? null : ev.travelFromMode,
            travelFromMinutes: idx === 0 ? null : ev.travelFromMinutes,
          })
        );
        onEventsChange(dayId, reordered);
      }

      setDragJustEnded(true);
      if (dragJustEndedTimer.current) clearTimeout(dragJustEndedTimer.current);
      dragJustEndedTimer.current = setTimeout(() => {
        setDragJustEnded(false);
        dragJustEndedTimer.current = null;
      }, 200);
    },
    [events, dayId, onEventsChange]
  );

  const handleDeleteEvent = useCallback(
    (event: TripEvent) => {
      const updated = events
        .filter((e) => e.id !== event.id)
        .map((e, i) => ({
          ...e,
          sortOrder: i + 1,
          travelFromMode: i === 0 ? null : e.travelFromMode,
          travelFromMinutes: i === 0 ? null : e.travelFromMinutes,
        }));
      onEventsChange(dayId, updated);
      setDetailEvent(null);
    },
    [events, dayId, onEventsChange]
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
      {(alternativesStore.isLoading ||
        alternativesStore.alternatives.length > 0 ||
        alternativesStore.error) && (
        <AlternativesPanel onSelect={handleAlternativeSelect} />
      )}

      <p className="text-xs text-muted text-center -mb-1">
        點擊查看詳情 · 長按拖曳排序
      </p>

      <div className="relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={events.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <div key={event.id} className="flex flex-col">
                  <TravelLegConnector event={event} />
                  <div className="flex items-start gap-2">
                    <div className="w-9 flex flex-col items-center shrink-0 pt-5 z-10">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-coral bg-card">
                        <div className="h-1.5 w-1.5 rounded-full bg-coral" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <SortableEvent
                        event={event}
                        dragJustEnded={dragJustEnded}
                        onTap={setDetailEvent}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onEdit={() => {
            onEditEvent(detailEvent);
            setDetailEvent(null);
          }}
          onDelete={() => handleDeleteEvent(detailEvent)}
        />
      )}
    </div>
  );
}
