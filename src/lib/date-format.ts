function getDateParts(dateStr: string): { month: number; day: number } {
  const [datePart] = dateStr.split("T");
  const [, month, day] = datePart.split("-").map(Number);
  return { month, day };
}

/** Format a date-only value (YYYY-MM-DD) without timezone conversion. */
export function formatDateOnly(dateStr: string): string {
  const { month, day } = getDateParts(dateStr);
  // Local Date with explicit parts — only used for zh-TW month labels, not timezone math.
  return new Date(2026, month - 1, day).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateRangeOnly(start: string, end: string): string {
  const s = getDateParts(start);
  const e = getDateParts(end);
  return `${s.month}/${s.day} – ${e.month}/${e.day}`;
}
