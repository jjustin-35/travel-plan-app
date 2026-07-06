import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressBar } from "@/components/onboarding/ProgressBar";

describe("ProgressBar", () => {
  it("renders correct number of step indicators", () => {
    render(
      <ProgressBar
        currentStep={2}
        totalSteps={7}
        onStepClick={vi.fn()}
        completedSteps={new Set([1])}
      />
    );
    expect(screen.getAllByRole("button")).toHaveLength(7);
  });

  it("allows clicking completed steps only", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(
      <ProgressBar
        currentStep={3}
        totalSteps={5}
        onStepClick={onStepClick}
        completedSteps={new Set([1, 2])}
      />
    );

    await user.click(screen.getByLabelText("Step 1"));
    expect(onStepClick).toHaveBeenCalledWith(1);

    await user.click(screen.getByLabelText("Step 4"));
    expect(onStepClick).toHaveBeenCalledTimes(1);
  });

  it("disables future incomplete steps", () => {
    render(
      <ProgressBar
        currentStep={2}
        totalSteps={5}
        onStepClick={vi.fn()}
        completedSteps={new Set([1])}
      />
    );
    expect(screen.getByLabelText("Step 4")).toBeDisabled();
  });
});
