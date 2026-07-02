import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TripCard } from "@/components/trip/TripCard";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
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
  it("renders trip summary and links to detail page", () => {
    render(<TripCard trip={sampleTrip} />);
    expect(screen.getByText("東京五日遊")).toBeInTheDocument();
    expect(screen.getByText("東京")).toBeInTheDocument();
    expect(screen.getByText("👥 2 人")).toBeInTheDocument();
    expect(screen.getByText("自由行")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/trips/trip-1");
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
});
