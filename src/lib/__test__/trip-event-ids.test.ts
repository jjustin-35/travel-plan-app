import { describe, expect, it } from "vitest";

import {
  VALID_EVENT_ID,
  VALID_EVENT_ID_2,
  validTripEvent,
  validTripResponse,
} from "@/__test__/fixtures";
import { withFreshTripEventIds } from "@/lib/trip-event-ids";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("withFreshTripEventIds", () => {
  it("replaces cached AI event IDs with fresh UUIDs", () => {
    const aiResult = {
      trip: {
        ...validTripResponse.trip,
        days: [
          {
            ...validTripResponse.trip.days[0],
            events: [
              validTripEvent,
              {
                ...validTripEvent,
                id: VALID_EVENT_ID_2,
                title: "Second event",
                sort_order: 2,
              },
            ],
          },
        ],
      },
    };

    const result = withFreshTripEventIds(aiResult);
    const freshIds = result.trip.days.flatMap((day) =>
      day.events.map((event) => event.id)
    );

    expect(freshIds).toHaveLength(2);
    expect(new Set(freshIds).size).toBe(2);
    expect(freshIds).not.toContain(VALID_EVENT_ID);
    expect(freshIds).not.toContain(VALID_EVENT_ID_2);
    expect(freshIds).toEqual(
      expect.arrayContaining([expect.stringMatching(UUID_PATTERN)])
    );
  });

  it("does not mutate the cached AI response", () => {
    const result = withFreshTripEventIds(validTripResponse);

    expect(validTripResponse.trip.days[0].events[0].id).toBe(VALID_EVENT_ID);
    expect(result.trip.days[0].events[0].id).not.toBe(VALID_EVENT_ID);
    expect(result.trip.days[0].events[0]).toMatchObject({
      ...validTripEvent,
      id: expect.any(String),
    });
  });
});
