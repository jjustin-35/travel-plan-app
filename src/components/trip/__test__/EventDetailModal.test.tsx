import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventDetailModal } from "@/components/trip/EventDetailModal";
import { uiTripEvent } from "@/__test__/fixtures";

describe("EventDetailModal", () => {
  it("renders event details", () => {
    render(
      <EventDetailModal
        event={uiTripEvent}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("行程詳情")).toBeInTheDocument();
    expect(screen.getByText("淺草寺")).toBeInTheDocument();
    expect(screen.getByText("東京都台東區淺草 2-3-1")).toBeInTheDocument();
    expect(screen.getByText(/東京最古老的寺廟/)).toBeInTheDocument();
  });

  it("calls onEdit and onDelete", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <EventDetailModal
        event={uiTripEvent}
        onEdit={onEdit}
        onDelete={onDelete}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByText("編輯"));
    expect(onEdit).toHaveBeenCalled();

    await user.click(screen.getByText("刪除"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container: _container } = render(
      <EventDetailModal
        event={uiTripEvent}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />
    );

    const backdrop = document.body.querySelector(".bg-black\\/40");
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });
});
