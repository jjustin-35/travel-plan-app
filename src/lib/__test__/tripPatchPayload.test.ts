import { describe, expect, it, vi } from "vitest";
import { uiTripEvent } from "@/__test__/fixtures";
import { buildTripPatchPayload } from "@/lib/tripPatchPayload";

describe("buildTripPatchPayload", () => {
  it("serializes UI trip events to the API patch schema", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T03:04:05.000Z"));

    expect(
      buildTripPatchPayload([{ dayNumber: 2, events: [uiTripEvent] }], 7)
    ).toEqual({
      client_version: 7,
      client_modified_at: "2026-04-02T03:04:05.000Z",
      days: [
        {
          day_number: 2,
          events: [
            {
              id: uiTripEvent.id,
              title: uiTripEvent.title,
              location: uiTripEvent.location,
              description: uiTripEvent.description,
              category: uiTripEvent.category,
              event_time: uiTripEvent.eventTime,
              duration_minutes: uiTripEvent.durationMinutes,
              sort_order: uiTripEvent.sortOrder,
              lat: uiTripEvent.lat,
              lng: uiTripEvent.lng,
            },
          ],
        },
      ],
    });

    vi.useRealTimers();
  });
});
