const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDateOnlyTime(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

export function calculateTripDuration(startDate: Date, endDate: Date) {
  const startTime = toUtcDateOnlyTime(startDate);
  const endTime = toUtcDateOnlyTime(endDate);
  const days = Math.max(Math.round((endTime - startTime) / MS_PER_DAY) + 1, 1);

  return {
    days,
    nights: Math.max(days - 1, 0),
  };
}
