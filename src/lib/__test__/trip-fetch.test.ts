import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uiTripEvent } from "@/__test__/fixtures";
import { getCachedTrip } from "@/lib/db/idb";
import { fetchTrip } from "@/lib/trip-fetch";

vi.mock("@/lib/db/idb", () => ({
  getCachedTrip: vi.fn(),
}));

const serverTrip = {
  id: "trip-1",
  title: "東京五日遊",
  destination: "東京",
  status: "ready",
  version: 3,
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

const cachedTrip = {
  ...serverTrip,
  title: "Cached 東京五日遊",
  version: 2,
  cachedAt: 123,
};

const mockGetCachedTrip = vi.mocked(getCachedTrip);

describe("fetchTrip", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockGetCachedTrip.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the server trip when the API succeeds", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ trip: serverTrip }), { status: 200 })
    );

    await expect(fetchTrip("trip-1")).resolves.toEqual(serverTrip);
    expect(mockGetCachedTrip).not.toHaveBeenCalled();
  });

  it("falls back to IndexedDB when the network request fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network unavailable"));
    mockGetCachedTrip.mockResolvedValue(cachedTrip);

    await expect(fetchTrip("trip-1")).resolves.toEqual({
      id: cachedTrip.id,
      title: cachedTrip.title,
      destination: cachedTrip.destination,
      status: cachedTrip.status,
      version: cachedTrip.version,
      startDate: cachedTrip.startDate,
      endDate: cachedTrip.endDate,
      days: cachedTrip.days,
    });
    expect(mockGetCachedTrip).toHaveBeenCalledWith("trip-1");
  });

  it("falls back to IndexedDB on temporary server errors", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Unavailable", { status: 503 }));
    mockGetCachedTrip.mockResolvedValue(cachedTrip);

    await expect(fetchTrip("trip-1")).resolves.toMatchObject({
      title: "Cached 東京五日遊",
      version: 2,
    });
  });

  it("does not use stale cache for not-found responses", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Not found", { status: 404 }));
    mockGetCachedTrip.mockResolvedValue(cachedTrip);

    await expect(fetchTrip("trip-1")).rejects.toThrow("Failed to fetch trip: 404");
    expect(mockGetCachedTrip).not.toHaveBeenCalled();
  });
});
