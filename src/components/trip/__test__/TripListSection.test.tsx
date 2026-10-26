import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TripListSection } from "@/components/trip/TripListSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TripListSection />
    </QueryClientProvider>
  );
}

describe("TripListSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows skeleton while loading", () => {
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      )
    );

    renderSection();
    expect(screen.getByLabelText("載入行程中")).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: async () => ({ trips: [] }),
    });
  });

  it("renders upcoming and past sections", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          trips: [
            {
              id: "upcoming-1",
              title: "未來行程",
              destination: "東京",
              startDate: isoDate(1),
              endDate: isoDate(5),
              peopleCount: 2,
              tripType: "自由行",
              status: "ready",
            },
            {
              id: "past-1",
              title: "過去行程",
              destination: "京都",
              startDate: isoDate(-10),
              endDate: isoDate(-5),
              peopleCount: 2,
              tripType: "自由行",
              status: "ready",
            },
          ],
        }),
      })
    );

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("即將到來")).toBeInTheDocument();
      expect(screen.getByText("過去的行程")).toBeInTheDocument();
      expect(screen.getByText("未來行程")).toBeInTheDocument();
      expect(screen.getByText("過去行程")).toBeInTheDocument();
    });
  });

  it("shows empty state when there are no trips", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ trips: [] }),
      })
    );

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("還沒有行程")).toBeInTheDocument();
    });
  });

  it("shows error and retries on failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "boom" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trips: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("無法載入行程")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "重試" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText("還沒有行程")).toBeInTheDocument();
    });
  });
});
