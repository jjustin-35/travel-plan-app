import { describe, it, expect } from "vitest";
import { buildTripPatchBody } from "@/lib/trip-patch";
import { uiTripEvent } from "@/__test__/fixtures";

describe("buildTripPatchBody", () => {
  it("maps client events to API snake_case payload", () => {
    const body = buildTripPatchBody(
      2,
      1,
      [uiTripEvent],
      "2026-04-01T00:00:00.000Z"
    );

    expect(body).toEqual({
      client_version: 2,
      client_modified_at: "2026-04-01T00:00:00.000Z",
      days: [
        {
          day_number: 1,
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
  });
});
