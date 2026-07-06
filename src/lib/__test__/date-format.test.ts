import { describe, it, expect } from "vitest";
import { formatDateOnly, formatDateRangeOnly } from "@/lib/date-format";

describe("date-format", () => {
  it("formats date-only string as calendar date", () => {
    expect(formatDateOnly("2026-04-01")).toBe("4月1日");
  });

  it("handles ISO datetime by using date part only", () => {
    expect(formatDateOnly("2026-04-01T00:00:00.000Z")).toBe("4月1日");
  });

  it("formats date range from date-only strings", () => {
    expect(formatDateRangeOnly("2026-04-01", "2026-04-05")).toBe("4/1 – 4/5");
  });
});
