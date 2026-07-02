import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "@/components/ui/ServiceWorkerRegistrar";

describe("ServiceWorkerRegistrar", () => {
  const register = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
  });

  it("registers service worker on mount", () => {
    render(<ServiceWorkerRegistrar />);
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("renders nothing", () => {
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container.firstChild).toBeNull();
  });

  it("skips registration when serviceWorker API is absent", () => {
    const original = navigator.serviceWorker;
    // @ts-expect-error simulate browsers without SW support
    delete navigator.serviceWorker;
    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    expect(register).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "serviceWorker", {
      value: original,
      configurable: true,
    });
  });
});
