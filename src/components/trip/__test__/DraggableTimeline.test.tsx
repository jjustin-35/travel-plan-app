import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraggableTimeline } from "@/components/trip/DraggableTimeline";
import { useAlternativesStore } from "@/stores/alternatives.store";
import {
  VALID_EVENT_ID,
  VALID_EVENT_ID_2,
  VALID_EVENT_ID_3,
  uiTripEvent,
  validTripEvent,
} from "@/__test__/fixtures";

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...sensors) => sensors),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  arrayMove: <T,>(items: T[], from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  },
  sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => undefined),
    },
  },
}));

const lunchEvent = {
  ...uiTripEvent,
  id: VALID_EVENT_ID_2,
  title: "午餐",
  sortOrder: 2,
};

function renderTimeline() {
  return render(
    <DraggableTimeline
      tripId="trip-1"
      dayId="day-1"
      dayNumber={1}
      dayDate="2026-04-01"
      events={[uiTripEvent, lunchEvent]}
      onEventsChange={vi.fn()}
      onEditEvent={vi.fn()}
      onAddEvent={vi.fn()}
    />
  );
}

describe("DraggableTimeline alternatives", () => {
  beforeEach(() => {
    useAlternativesStore.getState().clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests alternatives from the event detail action", async () => {
    const user = userEvent.setup();
    const alternative = {
      ...validTripEvent,
      id: VALID_EVENT_ID_3,
      title: "晴空塔",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ alternatives: [alternative] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderTimeline();

    await user.click(screen.getByText("淺草寺"));
    await user.click(screen.getByText("換一個"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/trips/trip-1/events/${VALID_EVENT_ID}/alternatives`);
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      event: {
        id: VALID_EVENT_ID,
        event_time: "09:00",
        duration_minutes: 90,
        sort_order: 1,
      },
      context: {
        day_date: "2026-04-01",
      },
    });
    expect(body.context.surrounding_events).toHaveLength(1);
    expect(body.context.surrounding_events[0]).toMatchObject({
      id: VALID_EVENT_ID_2,
      sort_order: 2,
    });

    expect(await screen.findByText("晴空塔")).toBeInTheDocument();
    expect(useAlternativesStore.getState().alternatives[0]).toMatchObject({
      id: VALID_EVENT_ID_3,
      eventTime: "09:00",
      durationMinutes: 90,
      sortOrder: 1,
    });
  });

  it("shows an error when alternatives cannot be generated", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderTimeline();

    await user.click(screen.getByText("淺草寺"));
    await user.click(screen.getByText("換一個"));

    expect(
      await screen.findByText("無法產生備選方案，請稍後再試")
    ).toBeInTheDocument();
  });
});
