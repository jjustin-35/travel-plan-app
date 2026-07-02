import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepDestination } from "@/components/onboarding/StepDestination";
import { useOnboardingStore } from "@/stores/onboarding.store";

describe("StepDestination", () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it("renders heading and input", () => {
    render(<StepDestination />);
    expect(screen.getByText("去哪旅行？")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("輸入目的地，例：東京・京都...")
    ).toBeInTheDocument();
  });

  it("updates store when typing destination", async () => {
    const user = userEvent.setup();
    render(<StepDestination />);
    await user.type(
      screen.getByPlaceholderText("輸入目的地，例：東京・京都..."),
      "京都"
    );
    expect(useOnboardingStore.getState().destination).toBe("京都");
  });

  it("selects popular destination on chip click", async () => {
    const user = userEvent.setup();
    render(<StepDestination />);
    await user.click(screen.getByRole("button", { name: /東京/ }));
    expect(useOnboardingStore.getState().destination).toBe("東京");
  });
});
