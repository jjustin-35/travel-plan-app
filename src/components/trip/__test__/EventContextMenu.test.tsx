import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventContextMenu } from "@/components/trip/EventContextMenu";

describe("EventContextMenu", () => {
  it("renders all menu actions", () => {
    render(<EventContextMenu onAction={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("編輯")).toBeInTheDocument();
    expect(screen.getByText("複製到其他天")).toBeInTheDocument();
    expect(screen.getByText("換一個")).toBeInTheDocument();
    expect(screen.getByText("刪除")).toBeInTheDocument();
  });

  it("calls onAction and onClose when item clicked", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(<EventContextMenu onAction={onAction} onClose={onClose} />);

    await user.click(screen.getByText("編輯"));
    expect(onAction).toHaveBeenCalledWith("edit");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking outside", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <EventContextMenu onAction={vi.fn()} onClose={onClose} />
      </div>
    );

    await user.click(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalled();
  });
});
