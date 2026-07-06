export type TripPatchEvent = {
  id: string;
  title: string;
  location: string;
  description: string;
  category: string;
  eventTime: string;
  durationMinutes: number;
  sortOrder: number;
  lat: number;
  lng: number;
};

export type TripPatchDay = {
  dayNumber: number;
  events: TripPatchEvent[];
};

export function buildTripPatchPayload(
  days: TripPatchDay[],
  clientVersion = 1
) {
  return {
    client_version: clientVersion,
    client_modified_at: new Date().toISOString(),
    days: days.map((day) => ({
      day_number: day.dayNumber,
      events: day.events.map((event) => ({
        id: event.id,
        title: event.title,
        location: event.location,
        description: event.description,
        category: event.category,
        event_time: event.eventTime,
        duration_minutes: event.durationMinutes,
        sort_order: event.sortOrder,
        lat: event.lat,
        lng: event.lng,
      })),
    })),
  };
}
