import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingAnimation } from "@/components/trip/LoadingAnimation";

describe("LoadingAnimation", () => {
  it("renders initial loading message and tip", () => {
    render(<LoadingAnimation />);
    expect(screen.getByText("正在為你規劃行程...")).toBeInTheDocument();
    expect(screen.getByText("「精彩的旅程值得等待 🌟」")).toBeInTheDocument();
  });

  it("shows destination in the subtitle when provided", () => {
    render(<LoadingAnimation destination="東京" />);
    expect(screen.getByText("為 東京 打造專屬行程中")).toBeInTheDocument();
  });

  it("renders the plane and suitcase illustration", () => {
    const { container } = render(<LoadingAnimation />);
    expect(container.querySelector('[aria-label="✈️"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="🧳"]')).toBeInTheDocument();
  });

  it("renders one message dot per loading message", () => {
    const { container } = render(<LoadingAnimation />);
    expect(
      container.querySelectorAll(".bg-coral.rounded-full").length
    ).toBeGreaterThanOrEqual(5);
  });
});
