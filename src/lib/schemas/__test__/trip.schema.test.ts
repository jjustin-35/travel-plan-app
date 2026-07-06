import { describe, it, expect } from "vitest";
import {
  TripEventSchema,
  TripDaySchema,
  TripResponseSchema,
  TripInputSchema,
  AlternativeEventsSchema,
} from "@/lib/schemas/trip.schema";
import {
  validTripEvent,
  validTripDay,
  validTripResponse,
  validTripInput,
  VALID_EVENT_ID_2,
  VALID_EVENT_ID_3,
} from "@/__test__/fixtures";

describe("TripEventSchema", () => {
  it("accepts a valid event", () => {
    expect(TripEventSchema.parse(validTripEvent)).toEqual(validTripEvent);
  });

  it("rejects invalid category", () => {
    expect(() =>
      TripEventSchema.parse({ ...validTripEvent, category: "博物館" })
    ).toThrow();
  });

  it("rejects invalid event_time format", () => {
    expect(() =>
      TripEventSchema.parse({ ...validTripEvent, event_time: "9:00" })
    ).toThrow();
  });

  it("rejects coordinates out of range", () => {
    expect(() =>
      TripEventSchema.parse({ ...validTripEvent, lat: 91 })
    ).toThrow();
  });
});

describe("TripDaySchema", () => {
  it("accepts a valid day with at least one event", () => {
    expect(TripDaySchema.parse(validTripDay)).toEqual(validTripDay);
  });

  it("rejects empty events array", () => {
    expect(() =>
      TripDaySchema.parse({ ...validTripDay, events: [] })
    ).toThrow();
  });
});

describe("TripResponseSchema", () => {
  it("accepts a valid trip response", () => {
    expect(TripResponseSchema.parse(validTripResponse)).toEqual(validTripResponse);
  });

  it("rejects missing title", () => {
    expect(() =>
      TripResponseSchema.parse({ trip: { title: "", days: [validTripDay] } })
    ).toThrow();
  });
});

describe("TripInputSchema", () => {
  it("accepts a valid trip input", () => {
    expect(TripInputSchema.parse(validTripInput)).toEqual(validTripInput);
  });

  it("accepts optional fields as undefined", () => {
    const minimal = {
      destination: "京都",
      startDate: "2026-05-01",
      endDate: "2026-05-03",
      days: 3,
      nights: 2,
      peopleCount: 1,
      tripType: "自由行",
    };
    expect(TripInputSchema.parse(minimal)).toEqual(minimal);
  });

  it("rejects invalid date format", () => {
    expect(() =>
      TripInputSchema.parse({ ...validTripInput, startDate: "2026/04/01" })
    ).toThrow();
  });
});

describe("AlternativeEventsSchema", () => {
  it("requires exactly 3 alternatives", () => {
    const alternatives = [
      validTripEvent,
      { ...validTripEvent, id: VALID_EVENT_ID_2, title: "晴空塔" },
      { ...validTripEvent, id: VALID_EVENT_ID_3, title: "上野公園" },
    ];
    expect(AlternativeEventsSchema.parse(alternatives)).toHaveLength(3);
  });

  it("rejects fewer than 3 alternatives", () => {
    expect(() =>
      AlternativeEventsSchema.parse([validTripEvent])
    ).toThrow();
  });
});
