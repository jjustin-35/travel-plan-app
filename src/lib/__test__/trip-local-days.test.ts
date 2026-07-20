import { describe, expect, it } from "vitest";
import { mergeDirtyTripDays, normalizeTripDays } from "@/lib/trip-local-days";

const serverDays = [
  {
    id: "day-1",
    date: "2026-04-01T12:34:56.000Z",
    events: [{ title: "server day 1" }],
  },
  {
    id: "day-2",
    date: "2026-04-02T12:34:56.000Z",
    events: [{ title: "server day 2" }],
  },
];

describe("trip local day helpers", () => {
  it("normalizes server dates to date-only strings", () => {
    expect(normalizeTripDays(serverDays)[0].date).toBe("2026-04-01");
  });

  it("preserves local dirty days while merging clean server days", () => {
    const localDays = [
      {
        id: "day-1",
        date: "2026-04-01",
        events: [{ title: "server day 1" }],
      },
      {
        id: "day-2",
        date: "2026-04-02",
        events: [{ title: "unsaved local day 2" }],
      },
    ];

    const merged = mergeDirtyTripDays(
      normalizeTripDays(serverDays),
      localDays,
      new Set(["day-2"])
    );

    expect(merged).toEqual([
      {
        id: "day-1",
        date: "2026-04-01",
        events: [{ title: "server day 1" }],
      },
      {
        id: "day-2",
        date: "2026-04-02",
        events: [{ title: "unsaved local day 2" }],
      },
    ]);
  });
});
