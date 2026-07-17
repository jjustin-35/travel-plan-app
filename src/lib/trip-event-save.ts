import type { TripEventInput } from "@/lib/trip-patch";

export type EditableTripDay = {
  id: string;
  dayNumber: number;
  date: string;
  events: TripEventInput[];
};

type BuildSavedEventsUpdateOptions = {
  days: EditableTripDay[];
  savedEvent: TripEventInput;
  addingForDay: number | null;
  editingEventId: string | null;
};

type SavedEventsUpdate = {
  dayId: string;
  events: TripEventInput[];
};

export function buildSavedEventsUpdate({
  days,
  savedEvent,
  addingForDay,
  editingEventId,
}: BuildSavedEventsUpdateOptions): SavedEventsUpdate | null {
  const targetDay =
    addingForDay !== null
      ? days.find((day) => day.dayNumber === addingForDay)
      : days.find((day) =>
          day.events.some((event) => event.id === (editingEventId ?? savedEvent.id))
        );

  if (!targetDay) return null;

  if (addingForDay !== null) {
    return {
      dayId: targetDay.id,
      events: [
        ...targetDay.events,
        { ...savedEvent, sortOrder: targetDay.events.length + 1 },
      ],
    };
  }

  let replaced = false;
  const events = targetDay.events.map((event) => {
    if (event.id !== savedEvent.id) return event;
    replaced = true;
    return savedEvent;
  });

  if (!replaced) return null;

  return {
    dayId: targetDay.id,
    events,
  };
}
