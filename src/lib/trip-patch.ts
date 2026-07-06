export type TripEventInput = {
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

export type TripPatchBody = {
  client_version: number;
  client_modified_at: string;
  days: Array<{
    day_number: number;
    events: Array<{
      id: string;
      title: string;
      location: string;
      description: string;
      category: string;
      event_time: string;
      duration_minutes: number;
      sort_order: number;
      lat: number;
      lng: number;
    }>;
  }>;
};

export function toApiEvent(event: TripEventInput) {
  return {
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
  };
}

export function buildTripPatchBody(
  clientVersion: number,
  dayNumber: number,
  events: TripEventInput[],
  clientModifiedAt: string = new Date().toISOString()
): TripPatchBody {
  return {
    client_version: clientVersion,
    client_modified_at: clientModifiedAt,
    days: [
      {
        day_number: dayNumber,
        events: events.map(toApiEvent),
      },
    ],
  };
}
