import { describe, expect, it } from "vitest";

import { calculateTripDuration } from "@/lib/trip-duration";

describe("calculateTripDuration", () => {
  it("calculates inclusive days and nights from the trip date range", () => {
    expect(
      calculateTripDuration(
        new Date("2026-04-01T00:00:00.000Z"),
        new Date("2026-04-05T00:00:00.000Z")
      )
    ).toEqual({ days: 5, nights: 4 });
  });

  it("ignores time components when dates are stored away from midnight", () => {
    expect(
      calculateTripDuration(
        new Date("2026-04-01T23:30:00.000Z"),
        new Date("2026-04-03T01:15:00.000Z")
      )
    ).toEqual({ days: 3, nights: 2 });
  });

  it("keeps same-day trips as one day and zero nights", () => {
    expect(
      calculateTripDuration(
        new Date("2026-04-01T00:00:00.000Z"),
        new Date("2026-04-01T00:00:00.000Z")
      )
    ).toEqual({ days: 1, nights: 0 });
  });
});
