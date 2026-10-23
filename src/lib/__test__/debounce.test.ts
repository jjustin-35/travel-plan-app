import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createKeyedDebouncer } from "@/lib/debounce";

describe("createKeyedDebouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays invocation until wait elapses", () => {
    const fn = vi.fn();
    const debouncer = createKeyedDebouncer(800);

    debouncer.schedule("a", fn);
    debouncer.schedule("a", fn);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(799);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("debounces per key independently", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const debouncer = createKeyedDebouncer(800);

    debouncer.schedule("day-1", fn1);
    debouncer.schedule("day-1", fn1);
    debouncer.schedule("day-2", fn2);

    vi.advanceTimersByTime(800);

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("cancel clears all pending calls", () => {
    const fn = vi.fn();
    const debouncer = createKeyedDebouncer(800);

    debouncer.schedule("a", fn);
    debouncer.cancel();
    vi.advanceTimersByTime(800);

    expect(fn).not.toHaveBeenCalled();
  });

  it("cancel(key) only clears that key", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const debouncer = createKeyedDebouncer(800);

    debouncer.schedule("day-1", fn1);
    debouncer.schedule("day-2", fn2);
    debouncer.cancel("day-1");
    vi.advanceTimersByTime(800);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
