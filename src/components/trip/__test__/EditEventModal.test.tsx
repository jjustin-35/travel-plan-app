import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditEventModal } from "@/components/trip/EditEventModal";
import { uiTripEvent } from "@/__test__/fixtures";

describe("EditEventModal", () => {
  it("renders create mode title", () => {
    render(
      <EditEventModal
        event={null}
        isNew
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("新增行程節點")).toBeInTheDocument();
  });

  it("renders edit mode with existing event data", () => {
    render(
      <EditEventModal
        event={uiTripEvent}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("編輯行程")).toBeInTheDocument();
    expect(screen.getByDisplayValue("淺草寺")).toBeInTheDocument();
    expect(screen.getByDisplayValue("09:00")).toBeInTheDocument();
  });

  it("disables save when required fields are empty", () => {
    render(
      <EditEventModal
        event={null}
        isNew
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "儲存" })).toBeDisabled();
  });

  it("calls onSave with form data when valid", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <EditEventModal
        event={null}
        isNew
        onSave={onSave}
        onClose={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("例：淺草寺"), "晴空塔");
    await user.type(
      screen.getByPlaceholderText("例：東京都台東區淺草 2-3-1"),
      "東京都墨田區"
    );
    await user.click(screen.getByRole("button", { name: "儲存" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "晴空塔",
        location: "東京都墨田區",
      })
    );
  });

  it("calls onClose when cancel or backdrop clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <EditEventModal
        event={uiTripEvent}
        onSave={vi.fn()}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = container.querySelector(".bg-black\\/30");
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("allows selecting a category", async () => {
    const user = userEvent.setup();
    render(
      <EditEventModal
        event={uiTripEvent}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /餐廳/ }));
    expect(screen.getByRole("button", { name: /餐廳/ }).className).toContain(
      "bg-coral"
    );
  });
});
