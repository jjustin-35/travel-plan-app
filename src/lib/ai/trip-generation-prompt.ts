import type { TripInput } from "@/lib/schemas/trip.schema";

export const TRIP_GENERATION_JSON_EXAMPLE = `{
  "trip": {
    "title": "string",
    "days": [
      {
        "day": 1,
        "date": "YYYY-MM-DD",
        "events": [
          {
            "id": "uuid-v4",
            "title": "string",
            "location": "string",
            "description": "string",
            "category": "景點 | 餐廳 | 咖啡廳 | 交通 | 住宿 | 購物 | 其他",
            "event_time": "HH:MM",
            "duration_minutes": 90,
            "sort_order": 1,
            "lat": 35.7148,
            "lng": 139.7967,
            "travel_from_mode": null,
            "travel_from_minutes": null
          },
          {
            "id": "uuid-v4",
            "title": "string",
            "location": "string",
            "description": "string",
            "category": "景點 | 餐廳 | 咖啡廳 | 交通 | 住宿 | 購物 | 其他",
            "event_time": "HH:MM",
            "duration_minutes": 90,
            "sort_order": 2,
            "lat": 35.7148,
            "lng": 139.7967,
            "travel_from_mode": "大眾運輸 | 步行 | 計程車 | 租車 | 單車",
            "travel_from_minutes": 15
          }
        ]
      }
    ]
  }
}`;

export function buildTripGenerationPrompt(input: TripInput): string {
  return `You are an expert travel planner specializing in creating detailed, personalized itineraries. Your goal is to design a realistic, enjoyable travel schedule based on the traveler's preferences.

## Traveler Information
- Destination: ${input.destination}
- Duration: ${input.days} days ${input.nights} nights
- Departure date: ${input.startDate}
- Return date: ${input.endDate}
- Number of travelers: ${input.peopleCount}
- Trip type: ${input.tripType}
- Budget range: ${input.budgetRange ?? "Not specified"}
- Preferred styles: ${input.preferredStyles?.join(", ") ?? "Not specified"}
- Preferred transport modes: ${input.preferredTransportModes?.join(", ") ?? "Not specified"}
- Special requirements: ${input.specialRequirements ?? "None"}

## Task
Generate a complete day-by-day travel itinerary in JSON format. The itinerary should feel natural and well-paced, like a plan crafted by a knowledgeable local guide.

## Schedule Density Guidelines
- Generate between 3 to 8 events per day
- Fewer events (3–4) for relaxation trips, family trips with elderly or young children
- More events (6–8) for short trips, city tours, solo travelers, friend groups
- Always include realistic travel time between locations
- Include at least one meal event per day
- Do NOT create separate events with category "交通" for moving between places; use travel_from fields instead

## Output Format
Respond ONLY with a valid JSON object. Do not include any explanation, markdown, or text outside the JSON.

${TRIP_GENERATION_JSON_EXAMPLE}

## Field Rules
- id: Must be a valid UUID v4. Never reuse IDs.
- category: Must be exactly one of the listed options (avoid using "交通" for inter-event movement).
- event_time: HH:MM format, chronological order within each day.
- sort_order: Starts at 1, increments by 1 within each day.
- travel_from_mode / travel_from_minutes: For sort_order 1, both must be null. For sort_order > 1, both are required.
- travel_from_mode: One of 步行 | 大眾運輸 | 計程車 | 租車 | 單車. Prefer the traveler's preferred transport modes when reasonable.
- travel_from_minutes: Non-negative integer minutes from the previous event location to this event.
- event_time for sort_order > 1 must equal previous event end time + travel_from_minutes.
- lat/lng: Real-world coordinates. Do not fabricate.
- description, title, location: Must be in Traditional Chinese (繁體中文).`;
}
