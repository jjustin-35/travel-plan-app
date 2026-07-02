import type { TripInput } from "@/lib/schemas/trip.schema";

export const VALID_EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
export const VALID_EVENT_ID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
export const VALID_EVENT_ID_3 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export const validTripEvent = {
  id: VALID_EVENT_ID,
  title: "淺草寺",
  location: "東京都台東區淺草 2-3-1",
  description: "東京最古老的寺廟",
  category: "景點" as const,
  event_time: "09:00",
  duration_minutes: 90,
  sort_order: 1,
  lat: 35.7148,
  lng: 139.7967,
};

export const validTripDay = {
  day: 1,
  date: "2026-04-01",
  events: [validTripEvent],
};

export const validTripResponse = {
  trip: {
    title: "東京五日遊",
    days: [validTripDay],
  },
};

export const validTripInput: TripInput = {
  destination: "東京",
  startDate: "2026-04-01",
  endDate: "2026-04-05",
  days: 5,
  nights: 4,
  peopleCount: 2,
  tripType: "自由行",
  budgetRange: "中等",
  preferredStyles: ["美食", "文化"],
  specialRequirements: "素食友善",
};

export const uiTripEvent = {
  id: VALID_EVENT_ID,
  title: "淺草寺",
  location: "東京都台東區淺草 2-3-1",
  description: "東京最古老的寺廟",
  category: "景點",
  eventTime: "09:00",
  durationMinutes: 90,
  sortOrder: 1,
  lat: 35.7148,
  lng: 139.7967,
};
