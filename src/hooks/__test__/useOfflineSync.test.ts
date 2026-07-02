import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOfflineSync, loadCachedTripFallback } from "@/hooks/useOfflineSync";
import { uiTripEvent } from "@/__test__/fixtures";

const mockCacheTrip = vi.fn();
const mockGetCachedTrip = vi.fn();
const mockQueueSync = vi.fn();
const mockGetAllPendingSyncs = vi.fn();
const mockResolveSync = vi.fn();

vi.mock("@/lib/db/idb", () => ({
  cacheTrip: (...args: unknown[]) => mockCacheTrip(...args),
  getCachedTrip: (...args: unknown[]) => mockGetCachedTrip(...args),
  queueSync: (...args: unknown[]) => mockQueueSync(...args),
  getAllPendingSyncs: (...args: unknown[]) => mockGetAllPendingSyncs(...args),
  resolveSync: (...args: unknown[]) => mockResolveSync(...args),
}));

const sampleTrip = {
  id: "trip-1",
  title: "東京五日遊",
  destination: "東京",
  status: "ready",
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

describe("useOfflineSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheTrip.mockResolvedValue(undefined);
    mockGetCachedTrip.mockResolvedValue({
      ...sampleTrip,
      cachedAt: Date.now(),
    });
    mockQueueSync.mockResolvedValue(undefined);
    mockGetAllPendingSyncs.mockResolvedValue([]);
    mockResolveSync.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports online status from navigator", () => {
    const { result } = renderHook(() =>
      useOfflineSync({ tripId: "trip-1", trip: null })
    );
    expect(result.current.isOnline).toBe(true);
  });

  it("caches trip when server data arrives", async () => {
    renderHook(() =>
      useOfflineSync({ tripId: "trip-1", trip: sampleTrip })
    );

    await waitFor(() => {
      expect(mockCacheTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "trip-1",
          title: "東京五日遊",
        })
      );
    });
  });

  it("saveEventsOffline updates cache and queues sync", async () => {
    const updatedEvents = [{ ...uiTripEvent, title: "晴空塔" }];
    const { result } = renderHook(() =>
      useOfflineSync({ tripId: "trip-1", trip: sampleTrip })
    );

    await act(async () => {
      await result.current.saveEventsOffline("day-1", updatedEvents);
    });

    expect(mockGetCachedTrip).toHaveBeenCalledWith("trip-1");
    expect(mockCacheTrip).toHaveBeenCalled();
    expect(mockQueueSync).toHaveBeenCalledWith("trip-1", "day-1", updatedEvents);
    expect(result.current.hasPendingSync).toBe(true);
  });

  it("flushes pending syncs when online", async () => {
    mockGetAllPendingSyncs
      .mockResolvedValueOnce([
        {
          id: "trip-1__day-1",
          tripId: "trip-1",
          dayId: "day-1",
          events: [uiTripEvent],
          updatedAt: Date.now(),
        },
      ])
      .mockResolvedValueOnce([]);

    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    renderHook(() =>
      useOfflineSync({ tripId: "trip-1", trip: sampleTrip })
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/trips/trip-1",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(mockResolveSync).toHaveBeenCalledWith("trip-1", "day-1");
    });
  });
});

describe("loadCachedTripFallback", () => {
  it("returns cached trip or null", async () => {
    mockGetCachedTrip.mockResolvedValueOnce({ id: "trip-1", cachedAt: 1 });
    const result = await loadCachedTripFallback("trip-1");
    expect(result?.id).toBe("trip-1");

    mockGetCachedTrip.mockResolvedValueOnce(undefined);
    expect(await loadCachedTripFallback("missing")).toBeNull();
  });
});
