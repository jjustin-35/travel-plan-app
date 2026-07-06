import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripCard } from "@/components/trip/TripCard";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
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

describe("TripCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true } as Response)
    ));
  });

  it("renders trip summary and opens detail page on click", async () => {
    const user = userEvent.setup();
    render(<TripCard trip={sampleTrip} />);
    expect(screen.getByText("東京五日遊")).toBeInTheDocument();
    expect(screen.getByText("東京")).toBeInTheDocument();
    expect(screen.getByText("👥 2 人")).toBeInTheDocument();
    expect(screen.getByText("自由行")).toBeInTheDocument();

    await user.click(screen.getByText("東京五日遊"));
    expect(mockPush).toHaveBeenCalledWith("/trips/trip-1");
  });

  it("shows destination emoji for known cities", () => {
    render(<TripCard trip={sampleTrip} />);
    expect(screen.getByText("🗼")).toBeInTheDocument();
  });

  it("shows generating badge when status is generating", () => {
    render(
      <TripCard trip={{ ...sampleTrip, status: "generating" }} />
    );
    expect(screen.getByText("規劃中")).toBeInTheDocument();
  });

  it("uses fallback emoji for unknown destination", () => {
    render(
      <TripCard trip={{ ...sampleTrip, destination: "冰島" }} />
    );
    expect(screen.getByText("✈️")).toBeInTheDocument();
  });

  it("deletes trip after confirmation", async () => {
    const user = userEvent.setup();
    render(<TripCard trip={sampleTrip} />);

    await user.click(screen.getByRole("button", { name: "刪除行程" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("刪除行程")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "刪除" }));

    expect(fetch).toHaveBeenCalledWith("/api/trips/trip-1", {
      method: "DELETE",
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<TripCard trip={sampleTrip} />);

    await user.click(screen.getByRole("button", { name: "刪除行程" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
