import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TripCard } from "@/components/trip/TripCard";
import { tripKeys } from "@/lib/api/trips";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const sampleTrip = {
  id: "trip-1",
  title: "東京五日遊",
  destination: "東京",
  startDate: "2026-04-01",
  endDate: "2026-04-05",
  peopleCount: 2,
  tripType: "自由行",
  status: "ready",
};

function renderCard(trip = sampleTrip) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={queryClient}>
      <TripCard trip={trip} />
    </QueryClientProvider>
  );
  return { ...view, invalidateSpy };
}

describe("TripCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response)
      )
    );
  });

  it("renders trip summary and opens detail page on click", async () => {
    renderCard();
    expect(screen.getByText("東京五日遊")).toBeInTheDocument();
    expect(screen.getByText("東京")).toBeInTheDocument();
    expect(screen.getByText("👥 2 人")).toBeInTheDocument();
    expect(screen.getByText("自由行")).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/trips/trip-1");
  });

  it("shows destination emoji for known cities", () => {
    renderCard();
    expect(screen.getByText("🗼")).toBeInTheDocument();
  });

  it("shows generating badge when status is generating", () => {
    renderCard({ ...sampleTrip, status: "generating" });
    expect(screen.getByText("規劃中")).toBeInTheDocument();
  });

  it("uses fallback emoji for unknown destination", () => {
    renderCard({ ...sampleTrip, destination: "冰島" });
    expect(screen.getByText("✈️")).toBeInTheDocument();
  });

  it("deletes trip after confirmation", async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderCard();

    await user.click(screen.getByRole("button", { name: "刪除行程" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("刪除行程")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/trips/trip-1", {
        method: "DELETE",
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tripKeys.all });
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "刪除行程" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
