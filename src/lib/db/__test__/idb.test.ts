import { describe, it, expect, beforeEach } from "vitest";
import {
  cacheTrip,
  getCachedTrip,
  getAllCachedTrips,
  deleteCachedTrip,
  queueSync,
  getAllPendingSyncs,
  resolveSync,
} from "@/lib/db/idb";
import { uiTripEvent } from "@/__test__/fixtures";

const sampleTrip = {
  id: "trip-1",
  title: "東京五日遊",
  destination: "東京",
  status: "ready",
  version: 1,
  startDate: "2026-04-01",
  endDate: "2026-04-05",
  days: [
    {
      id: "day-1",
      dayNumber: 1,
      date: "2026-04-01",
      events: [uiTripEvent],
    },
  ],
};

describe("idb", () => {
  beforeEach(async () => {
    const cached = await getAllCachedTrips();
    await Promise.all(cached.map((t) => deleteCachedTrip(t.id)));
    const pending = await getAllPendingSyncs();
    await Promise.all(
      pending.map((p) => resolveSync(p.tripId, p.dayId))
    );
  });

  it("caches and retrieves a trip", async () => {
    await cacheTrip(sampleTrip);
    const cached = await getCachedTrip("trip-1");
    expect(cached?.title).toBe("東京五日遊");
    expect(cached?.cachedAt).toBeTypeOf("number");
  });

  it("returns undefined for missing trip", async () => {
    expect(await getCachedTrip("missing")).toBeUndefined();
  });

  it("lists all cached trips", async () => {
    await cacheTrip(sampleTrip);
    await cacheTrip({ ...sampleTrip, id: "trip-2", title: "京都三日遊" });
    const all = await getAllCachedTrips();
    expect(all).toHaveLength(2);
  });

  it("deletes cached trip", async () => {
    await cacheTrip(sampleTrip);
    await deleteCachedTrip("trip-1");
    expect(await getCachedTrip("trip-1")).toBeUndefined();
  });

  it("queues and retrieves pending syncs", async () => {
    const events = [uiTripEvent];
    await queueSync("trip-1", "day-1", events);
    const pending = await getAllPendingSyncs();
    expect(pending).toHaveLength(1);
    expect(pending[0].events).toEqual(events);
    expect(pending[0].id).toBe("trip-1__day-1");
  });

  it("resolves pending sync by trip and day", async () => {
    await queueSync("trip-1", "day-1", [uiTripEvent]);
    await resolveSync("trip-1", "day-1");
    expect(await getAllPendingSyncs()).toHaveLength(0);
  });
});
