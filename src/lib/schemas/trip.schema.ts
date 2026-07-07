import { z } from "zod";

export const TransportModeSchema = z.enum([
  "步行",
  "大眾運輸",
  "計程車",
  "租車",
  "單車",
]);

export const TripEventSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    location: z.string().min(1),
    description: z.string().min(1),
    category: z.enum(["景點", "餐廳", "咖啡廳", "交通", "住宿", "購物", "其他"]),
    event_time: z.string().regex(/^\d{2}:\d{2}$/),
    duration_minutes: z.number().int().positive(),
    sort_order: z.number().int().positive(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    travel_from_mode: TransportModeSchema.nullable(),
    travel_from_minutes: z.number().int().nonnegative().nullable(),
  })
  .superRefine((event, ctx) => {
    if (event.sort_order === 1) {
      if (event.travel_from_mode !== null || event.travel_from_minutes !== null) {
        ctx.addIssue({
          code: "custom",
          message: "First event of the day must have null travel_from fields",
          path: ["travel_from_mode"],
        });
      }
      return;
    }
    if (event.travel_from_mode === null) {
      ctx.addIssue({
        code: "custom",
        message: "travel_from_mode is required when sort_order > 1",
        path: ["travel_from_mode"],
      });
    }
    if (event.travel_from_minutes === null) {
      ctx.addIssue({
        code: "custom",
        message: "travel_from_minutes is required when sort_order > 1",
        path: ["travel_from_minutes"],
      });
    }
  });

export const TripDaySchema = z.object({
  day: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  events: z.array(TripEventSchema).min(1),
});

export const TripResponseSchema = z.object({
  trip: z.object({
    title: z.string().min(1),
    days: z.array(TripDaySchema).min(1),
  }),
});

export const AlternativeEventsSchema = z.array(TripEventSchema).length(3);

export const TripInputSchema = z.object({
  destination: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().positive(),
  nights: z.number().int().nonnegative(),
  peopleCount: z.number().int().positive(),
  tripType: z.string().min(1),
  budgetRange: z.string().optional(),
  preferredStyles: z.array(z.string()).optional(),
  preferredTransportModes: z.array(TransportModeSchema).optional(),
  specialRequirements: z.string().optional(),
});

export type TransportMode = z.infer<typeof TransportModeSchema>;
export type TripEventApi = z.infer<typeof TripEventSchema>;
export type TripDay = z.infer<typeof TripDaySchema>;
export type TripResponse = z.infer<typeof TripResponseSchema>;
export type TripInput = z.infer<typeof TripInputSchema>;

/** UI / API camelCase event shape */
export type TripEvent = {
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
  travelFromMode: TransportMode | null;
  travelFromMinutes: number | null;
};

export function toApiTravelFields(event: TripEvent) {
  return {
    travel_from_mode: event.travelFromMode,
    travel_from_minutes: event.travelFromMinutes,
  };
}
