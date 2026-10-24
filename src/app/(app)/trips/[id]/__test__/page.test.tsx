import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TripDetailPage from "@/app/(app)/trips/[id]/page";

const mocks = vi.hoisted(() => ({
  saveEventsOffline: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "trip-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: () => "channel",
      }),
    }),
    removeChannel: vi.fn(),
  }),
}));

vi.mock("@/hooks/useOfflineSync", () => ({
  useOfflineSync: () => ({
    isOnline: true,
    hasPendingSync: false,
    saveEventsOffline: mocks.saveEventsOffline,
  }),
}));

vi.mock("@/components/trip/TimelineView", () => ({
  TimelineView: ({
    onEventsChange,
  }: {
    onEventsChange: (dayId: string, events: unknown[]) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onEventsChange("day-1", [
          {
            id: "11111111-1111-4111-8111-111111111111",
            title: "Updated stop",
            location: "Tokyo Station",
            description: "Updated description",
            category: "景點",
            eventTime: "10:00",
            durationMinutes: 60,
            sortOrder: 1,
            lat: 35.6812,
            lng: 139.7671,
          },
        ])
      }
    >
      change events
    </button>
  ),
}));

vi.mock("@/components/trip/LoadingAnimation", () => ({
  LoadingAnimation: () => <div>loading trip</div>,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TripDetailPage />
    </QueryClientProvider>
  );
}

describe("TripDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveEventsOffline.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === "PATCH" && url === "/api/trips/trip-1") {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            trip: {
              id: "trip-1",
              title: "Tokyo trip",
              destination: "Tokyo",
              status: "ready",
              version: 3,
              days: [
                {
                  id: "day-1",
                  dayNumber: 1,
                  date: "2026-04-01T00:00:00.000Z",
                  events: [],
                },
              ],
            },
          }),
        } as Response;
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("flushes pending online saves when unmounted during debounce", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const { unmount } = renderPage();

    await user.click(await screen.findByRole("button", { name: "change events" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/trips/trip-1",
        expect.objectContaining({ method: "PATCH" })
      );
    });

    expect(mocks.saveEventsOffline).toHaveBeenCalledWith(
      "day-1",
      1,
      expect.any(Array)
    );
  });
});
