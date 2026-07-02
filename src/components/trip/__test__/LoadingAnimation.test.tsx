import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingAnimation } from "@/components/trip/LoadingAnimation";

describe("LoadingAnimation", () => {
  it("renders initial loading message", () => {
    render(<LoadingAnimation />);
    expect(screen.getByText("正在為你規劃行程...")).toBeInTheDocument();
    expect(screen.getByText("精彩的旅程值得等待 🌟")).toBeInTheDocument();
  });

  it("renders animated suitcase and plane", () => {
    const { container } = render(<LoadingAnimation />);
    expect(container.textContent).toContain("🧳");
    expect(container.textContent).toContain("✈️");
  });

  it("renders loading dots", () => {
    const { container } = render(<LoadingAnimation />);
    expect(container.querySelectorAll(".bg-coral.rounded-full")).toHaveLength(3);
  });
});
