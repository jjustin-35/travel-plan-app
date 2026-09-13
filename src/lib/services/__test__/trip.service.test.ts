import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTrip,
  listTrips,
  getTrip,
  patchTrip,
  deleteTrip,
  TripCreationTimeoutError,
} from "@/lib/services/trip.service";
import { validTripInput } from "@/__test__/fixtures";

const mockGenerateTrip = vi.fn();
const mockCreateTripWithDays = vi.fn();
const mockGetTripsByUser = vi.fn();
const mockGetTripById = vi.fn();
const mockUpdateTripEvents = vi.fn();
const mockDeleteTripById = vi.fn();

vi.mock("@/lib/services/ai-generation.service", () => ({
  generateTrip: (...args: unknown[]) => mockGenerateTrip(...args),
}));

vi.mock("@/lib/db/trip.repository", () => ({
  createTripWithDays: (...args: unknown[]) => mockCreateTripWithDays(...args),
  getTripsByUser: (...args: unknown[]) => mockGetTripsByUser(...args),
  getTripById: (...args: unknown[]) => mockGetTripById(...args),
  updateTripEvents: (...args: unknown[]) => mockUpdateTripEvents(...args),
  deleteTripById: (...args: unknown[]) => mockDeleteTripById(...args),
}));

describe("trip.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TRIP_CREATION_TIMEOUT_MS;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.TRIP_CREATION_TIMEOUT_MS;
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

  it("times out sync trip creation before persisting a hung AI response", async () => {
    vi.useFakeTimers();
    process.env.TRIP_CREATION_TIMEOUT_MS = "1000";
    mockGenerateTrip.mockReturnValue(new Promise(() => undefined));

    const result = createTrip("user-1", validTripInput);
    const assertion = expect(result).rejects.toBeInstanceOf(
      TripCreationTimeoutError
    );

    await vi.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(mockCreateTripWithDays).not.toHaveBeenCalled();
  });

  it("listTrips delegates to repository", async () => {
    mockGetTripsByUser.mockResolvedValue([{ id: "trip-1" }]);
    const result = await listTrips("user-1");
    expect(mockGetTripsByUser).toHaveBeenCalledWith("user-1");
    expect(result).toHaveLength(1);
  });

  it("getTrip delegates to repository with user scope", async () => {
    mockGetTripById.mockResolvedValue({ id: "trip-1" });
    await getTrip("trip-1", "user-1");
    expect(mockGetTripById).toHaveBeenCalledWith("trip-1", "user-1");
  });

  it("patchTrip forwards version and days for LWW update", async () => {
    const days = [{ dayNumber: 1, events: [] }];
    mockUpdateTripEvents.mockResolvedValue({ id: "trip-1", version: 2 });
    await patchTrip("trip-1", "user-1", 1, "2026-04-01T00:00:00Z", days);
    expect(mockUpdateTripEvents).toHaveBeenCalledWith(
      "trip-1",
      "user-1",
      1,
      "2026-04-01T00:00:00Z",
      days
    );
  });

  it("deleteTrip delegates to repository", async () => {
    mockDeleteTripById.mockResolvedValue(undefined);
    await deleteTrip("trip-1", "user-1");
    expect(mockDeleteTripById).toHaveBeenCalledWith("trip-1", "user-1");
  });
});
