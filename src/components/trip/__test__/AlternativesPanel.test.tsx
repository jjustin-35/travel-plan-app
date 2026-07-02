import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlternativesPanel } from "@/components/trip/AlternativesPanel";
import { useAlternativesStore } from "@/stores/alternatives.store";
import { uiTripEvent } from "@/__test__/fixtures";

describe("AlternativesPanel", () => {
  beforeEach(() => {
    useAlternativesStore.getState().clear();
  });

  it("renders nothing when idle", () => {
    const { container } = render(<AlternativesPanel onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows loading skeletons", () => {
    useAlternativesStore.getState().startLoading("event-1");
    const { container } = render(<AlternativesPanel onSelect={vi.fn()} />);
    expect(screen.getByText("🔄 備選方案")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("shows error message", () => {
    useAlternativesStore.getState().startLoading("event-1");
    useAlternativesStore.getState().setError("無法產生備選");
    render(<AlternativesPanel onSelect={vi.fn()} />);
    expect(screen.getByText("無法產生備選")).toBeInTheDocument();
  });

  it("renders alternatives and calls onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const alt = { ...uiTripEvent, title: "晴空塔" };
    useAlternativesStore.getState().setAlternatives("event-1", [alt]);

    render(<AlternativesPanel onSelect={onSelect} />);
    expect(screen.getByText("晴空塔")).toBeInTheDocument();

    await user.click(screen.getByText("選擇"));
    expect(onSelect).toHaveBeenCalledWith(alt);
  });

  it("clears store when cancel clicked", async () => {
    const user = userEvent.setup();
    useAlternativesStore.getState().setAlternatives("event-1", [uiTripEvent]);
    render(<AlternativesPanel onSelect={vi.fn()} />);

    await user.click(screen.getByText("取消"));
    expect(useAlternativesStore.getState().alternatives).toEqual([]);
  });
});
