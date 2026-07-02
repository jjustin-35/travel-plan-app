import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineView } from "@/components/trip/TimelineView";
import { uiTripEvent } from "@/__test__/fixtures";

vi.mock("@/components/trip/DraggableTimeline", () => ({
  DraggableTimeline: () => <div data-testid="draggable-timeline">timeline</div>,
}));

const days = [
  {
    id: "day-1",
    dayNumber: 1,
    date: "2026-04-01",
    events: [uiTripEvent],
  },
  {
    id: "day-2",
    dayNumber: 2,
    date: "2026-04-02",
    events: [],
  },
];

describe("TimelineView", () => {
  it("renders day tabs and active day timeline", () => {
    render(
      <TimelineView
        tripId="trip-1"
        days={days}
        activeDay={1}
        onDayChange={vi.fn()}
        onEventsChange={vi.fn()}
        onEditEvent={vi.fn()}
        onAddEvent={vi.fn()}
      />
    );
    expect(screen.getByText("Day 1")).toBeInTheDocument();
    expect(screen.getByText("Day 2")).toBeInTheDocument();
    expect(screen.getByTestId("draggable-timeline")).toBeInTheDocument();
  });

  it("calls onDayChange when tab clicked", async () => {
    const user = userEvent.setup();
    const onDayChange = vi.fn();
    render(
      <TimelineView
        tripId="trip-1"
        days={days}
        activeDay={1}
        onDayChange={onDayChange}
        onEventsChange={vi.fn()}
        onEditEvent={vi.fn()}
        onAddEvent={vi.fn()}
      />
    );

    await user.click(screen.getByText("Day 2"));
    expect(onDayChange).toHaveBeenCalledWith(2);
  });
});
