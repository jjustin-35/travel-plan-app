export type TripDayLike = {
  id: string;
  date: string | Date;
};

export function normalizeTripDays<TDay extends TripDayLike>(
  days: TDay[]
): Array<Omit<TDay, "date"> & { date: string }> {
  return days.map((day) => ({
    ...day,
    date: new Date(day.date).toISOString().split("T")[0],
  }));
}

export function mergeDirtyTripDays<TDay extends { id: string }>(
  serverDays: TDay[],
  localDays: TDay[],
  dirtyDayIds: ReadonlySet<string>
): TDay[] {
  if (dirtyDayIds.size === 0) return serverDays;

  const localDayMap = new Map(localDays.map((day) => [day.id, day]));
  return serverDays.map((serverDay) => {
    if (!dirtyDayIds.has(serverDay.id)) return serverDay;
    return localDayMap.get(serverDay.id) ?? serverDay;
  });
}
