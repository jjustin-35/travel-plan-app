import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TripDetailPage from "@/app/(app)/trips/[id]/page";

const mockPush = vi.hoisted(() => vi.fn());
const mockSaveEventsOffline = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "trip-1" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/useOfflineSync", () => ({
  useOfflineSync: () => ({
    isOnline: true,
    hasPendingSync: false,
    saveEventsOffline: mockSaveEventsOffline,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const channel = {
      on: () => channel,
      subscribe: () => channel,
    };
    return {
      channel: () => channel,
      removeChannel: vi.fn(),
    };
  },
}));

vi.mock("@/components/trip/TimelineView", () => ({
  TimelineView: ({
    days,
    onEventsChange,
  }: {
    days: Array<{ id: string; events: unknown[] }>;
    onEventsChange: (dayId: string, events: unknown[]) => void;
  }) => (
    <div data-testid="trip-detail">
      <button
        type="button"
        onClick={() =>
          onEventsChange("day-1", [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              title: "Day 1 updated",
              location: "Tokyo",
              description: "Updated",
              category: "景點",
              eventTime: "09:00",
              durationMinutes: 60,
              sortOrder: 1,
              lat: 35,
              lng: 139,
            },
          ])
        }
      >
        update day 1
      </button>
      <button
        type="button"
        onClick={() =>
          onEventsChange("day-2", [
            {
              id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
              title: "Day 2 updated",
              location: "Kyoto",
              description: "Updated",
              category: "美食",
              eventTime: "10:00",
              durationMinutes: 90,
              sortOrder: 1,
              lat: 35,
              lng: 135,
            },
          ])
        }
      >
        update day 2
      </button>
      {days.map((day) => (
        <div key={day.id} data-testid={day.id}>
          {day.events.length}
        </div>
      ))}
    </div>
  ),
}));

const trip = {
  id: "trip-1",
  title: "Tokyo trip",
  destination: "Tokyo",
  status: "ready",
  version: 1,
  days: [
    {
      id: "day-1",
      dayNumber: 1,
      date: "2026-04-01T00:00:00.000Z",
      events: [],
    },
    {
      id: "day-2",
      dayNumber: 2,
      date: "2026-04-02T00:00:00.000Z",
      events: [],
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TripDetailPage />
    </QueryClientProvider>
  );
}

describe("TripDetailPage remote saves", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSaveEventsOffline.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("serializes debounced saves so each day uses the latest trip version", async () => {
    const patchBodies: unknown[] = [];
    let serverVersion = 1;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          patchBodies.push(JSON.parse(String(init.body)));
          serverVersion += 1;
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        return new Response(
          JSON.stringify({ trip: { ...trip, version: serverVersion } }),
          { status: 200 }
        );
      })
    );

    renderPage();

    await screen.findByTestId("trip-detail");

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "update day 1" }));
    await user.click(screen.getByRole("button", { name: "update day 2" }));

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(patchBodies).toHaveLength(2);
    });

    expect(patchBodies).toMatchObject([
      { client_version: 1, days: [{ day_number: 1 }] },
      { client_version: 2, days: [{ day_number: 2 }] },
    ]);
  });
});
