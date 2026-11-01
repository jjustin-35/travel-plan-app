import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTrip, regenerateTrip } from "@/lib/services/trip.service";
import { validTripInput } from "@/__test__/fixtures";

const mockGenerateTrip = vi.fn();
const mockCreateTripWithDays = vi.fn();
const mockReplaceTripFromAi = vi.fn();
const mockGetTripById = vi.fn();

vi.mock("@/lib/services/ai-generation.service", () => ({
  generateTrip: (...args: unknown[]) => mockGenerateTrip(...args),
}));

vi.mock("@/lib/db/trip.repository", () => ({
  createTripWithDays: (...args: unknown[]) => mockCreateTripWithDays(...args),
  replaceTripFromAi: (...args: unknown[]) => mockReplaceTripFromAi(...args),
  getTripById: (...args: unknown[]) => mockGetTripById(...args),
}));

describe("trip.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTrip generates AI itinerary then persists to DB", async () => {
    const aiResult = { trip: { title: "東京五日遊", days: [] } };
    const savedTrip = { id: "trip-1", title: "東京五日遊" };
    mockGenerateTrip.mockResolvedValue(aiResult);
    mockCreateTripWithDays.mockResolvedValue(savedTrip);

    const result = await createTrip("user-1", validTripInput);

    expect(mockGenerateTrip).toHaveBeenCalledWith(validTripInput);
    expect(mockCreateTripWithDays).toHaveBeenCalledWith(
      "user-1",
      validTripInput,
      aiResult
    );
    expect(result).toEqual(savedTrip);
  });

  it("regenerateTrip generates a new itinerary and overwrites the existing trip", async () => {
    const aiResult = { trip: { title: "東京五日遊", days: [] } };
    const savedTrip = { id: "trip-1", title: "東京五日遊", version: 2 };
    mockGenerateTrip.mockResolvedValue(aiResult);
    mockGetTripById.mockResolvedValue(savedTrip);

    const result = await regenerateTrip("user-1", "trip-1", validTripInput);

    expect(mockGenerateTrip).toHaveBeenCalledWith(validTripInput);
    expect(mockReplaceTripFromAi).toHaveBeenCalledWith("trip-1", aiResult);
    expect(mockGetTripById).toHaveBeenCalledWith("trip-1", "user-1");
    expect(result).toEqual(savedTrip);
  });
});
