import { z } from "zod";

export const TripEventSchema = z.object({
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

export const AlternativeEventsSchema = z
  .array(TripEventSchema)
  .length(3);

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
  specialRequirements: z.string().optional(),
});

export type TripEvent = z.infer<typeof TripEventSchema>;
export type TripDay = z.infer<typeof TripDaySchema>;
export type TripResponse = z.infer<typeof TripResponseSchema>;
export type TripInput = z.infer<typeof TripInputSchema>;
