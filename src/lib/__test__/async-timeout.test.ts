import { describe, expect, it, vi } from "vitest";

import { TimeoutError, withTimeout } from "@/lib/async-timeout";

describe("withTimeout", () => {
  it("returns the operation result when it completes before the timeout", async () => {
    await expect(withTimeout(Promise.resolve("done"), 100)).resolves.toBe("done");
  });

  it("rejects with TimeoutError when the timeout elapses first", async () => {
    vi.useFakeTimers();

    try {
      const result = withTimeout(new Promise<string>(() => undefined), 100, "too slow");
      const expectation = result.catch((error: unknown) => {
        expect(error).toBeInstanceOf(TimeoutError);
        expect(error).toMatchObject({ message: "too slow" });
      });

      await vi.advanceTimersByTimeAsync(100);

      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });
});
