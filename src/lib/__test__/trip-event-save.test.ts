import { describe, expect, it } from "vitest";

import { buildSavedEventsUpdate, type EditableTripDay } from "@/lib/trip-event-save";
import { uiTripEvent } from "@/__test__/fixtures";

const days: EditableTripDay[] = [
  {
    id: "day-1",
    dayNumber: 1,
    date: "2026-04-01",
    events: [uiTripEvent],
  },
  {
    id: "day-2",
    dayNumber: 2,
    date: "2026-04-02",
    events: [],
  },
];

describe("buildSavedEventsUpdate", () => {
  it("updates the day that owns the edited event", () => {
    const savedEvent = { ...uiTripEvent, title: "Updated title" };

    const result = buildSavedEventsUpdate({
      days,
      savedEvent,
      addingForDay: null,
      editingEventId: uiTripEvent.id,
    });

    expect(result?.dayId).toBe("day-1");
    expect(result?.events).toEqual([savedEvent]);
  });

  it("adds new events to the day captured when the modal opened", () => {
    const newEvent = { ...uiTripEvent, id: "550e8400-e29b-41d4-a716-446655440000" };

    const result = buildSavedEventsUpdate({
      days,
      savedEvent: newEvent,
      addingForDay: 2,
      editingEventId: null,
    });

    expect(result?.dayId).toBe("day-2");
    expect(result?.events).toEqual([{ ...newEvent, sortOrder: 1 }]);
  });

  it("does not pretend to save an edit when the original event is gone", () => {
    const result = buildSavedEventsUpdate({
      days,
      savedEvent: { ...uiTripEvent, id: "550e8400-e29b-41d4-a716-446655440001" },
      addingForDay: null,
      editingEventId: "550e8400-e29b-41d4-a716-446655440001",
    });

    expect(result).toBeNull();
  });
});
