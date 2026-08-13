import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TripDetailPage from "@/app/(app)/trips/[id]/page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  saveEventsOffline: vi.fn(),
  channelOn: vi.fn(),
  subscribe: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "trip-1" }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/hooks/useOfflineSync", () => ({
  useOfflineSync: () => ({
    isOnline: true,
    hasPendingSync: false,
    saveEventsOffline: mocks.saveEventsOffline,
  }),
}));

vi.mock("@/lib/supabase/client", () => {
  const channel = {
    on: mocks.channelOn.mockReturnThis(),
    subscribe: mocks.subscribe.mockReturnValue("channel"),
  };

  return {
    createClient: () => ({
      channel: vi.fn(() => channel),
      removeChannel: mocks.removeChannel,
    }),
  };
});

vi.mock("@/components/trip/TimelineView", () => ({
  TimelineView: () => <div data-testid="timeline">editable timeline</div>,
}));

vi.mock("@/components/trip/LoadingAnimation", () => ({
  LoadingAnimation: () => <div data-testid="loading">loading trip</div>,
}));

vi.mock("@/components/ui/AddFab", () => ({
  AddFab: () => <button type="button">add event</button>,
}));

const sampleTrip = {
  id: "trip-1",
  title: "東京五日遊",
  destination: "東京",
  status: "ready",
  version: 1,
  days: [
    {
      id: "day-1",
      dayNumber: 1,
      date: "2026-04-01",
      events: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "淺草寺",
          location: "東京都台東區淺草 2-3-1",
          description: "東京最古老的寺廟",
          category: "景點",
          eventTime: "09:00",
          durationMinutes: 90,
          sortOrder: 1,
          lat: 35.7148,
          lng: 139.7967,
        },
      ],
    },
  ],
};

function renderTripDetailPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  queryClient.setQueryData(["trip", "trip-1"], sampleTrip);

  render(
    <QueryClientProvider client={queryClient}>
      <TripDetailPage />
    </QueryClientProvider>
  );
}

describe("TripDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
  });

  it("blocks editing immediately after regeneration starts", async () => {
    const user = userEvent.setup();
    renderTripDetailPage();

    expect(screen.getByTestId("timeline")).toBeInTheDocument();

    await user.click(screen.getByTitle("重新產生行程"));

    expect(fetch).toHaveBeenCalledWith("/api/trips/trip-1/regenerate", {
      method: "POST",
    });
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("timeline")).not.toBeInTheDocument();
  });
});
