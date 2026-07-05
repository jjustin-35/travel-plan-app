import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventCard } from "@/components/trip/EventCard";
import { uiTripEvent } from "@/__test__/fixtures";

describe("EventCard", () => {
  it("renders event details", () => {
    render(<EventCard event={uiTripEvent} />);
    expect(screen.getByText("淺草寺")).toBeInTheDocument();
    expect(screen.getByText("東京都台東區淺草 2-3-1")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("景點")).toBeInTheDocument();
    expect(screen.getByText(/1 小時 30 分鐘/)).toBeInTheDocument();
  });

  it("calls onTap when clicked", async () => {
    const user = userEvent.setup();
    const onTap = vi.fn();
    render(<EventCard event={uiTripEvent} onTap={onTap} />);
    await user.click(screen.getByRole("button"));
    expect(onTap).toHaveBeenCalledWith(uiTripEvent);
  });

  it("shows dragging style when isDragging", () => {
    const { container } = render(
      <EventCard event={uiTripEvent} isDragging />
    );
    expect(container.querySelector(".ring-coral\\/30")).toBeTruthy();
  });

  it("formats duration over 60 minutes", () => {
    render(
      <EventCard event={{ ...uiTripEvent, durationMinutes: 90 }} />
    );
    expect(screen.getByText(/1 小時 30 分鐘/)).toBeInTheDocument();
  });

  it("falls back to default category config for unknown category", () => {
    render(<EventCard event={{ ...uiTripEvent, category: "未知" }} />);
    expect(screen.getByText("未知")).toBeInTheDocument();
  });
});
