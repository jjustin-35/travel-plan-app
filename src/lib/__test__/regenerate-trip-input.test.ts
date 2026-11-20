import { describe, expect, it } from "vitest";

import { buildDefaultRegenerateInput } from "@/lib/regenerate-trip-input";

describe("buildDefaultRegenerateInput", () => {
  it("derives duration from trip dates instead of persisted day rows", () => {
    const existing = {
      destination: "東京",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-05T00:00:00.000Z"),
      days: [{ dayNumber: 1 }],
      peopleCount: 2,
      tripType: "自由行",
    };

    expect(buildDefaultRegenerateInput(existing)).toEqual({
      destination: "東京",
      startDate: "2026-04-01",
      endDate: "2026-04-05",
      days: 5,
      nights: 4,
      peopleCount: 2,
      tripType: "自由行",
    });
  });
});
