import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTrip,
  generateAlternatives,
  AIRateLimitError,
  AIValidationError,
} from "@/lib/services/ai-generation.service";
import {
  validTripInput,
  validTripResponse,
  validTripDay,
  validTripEvent,
  VALID_EVENT_ID_2,
  VALID_EVENT_ID_3,
} from "@/__test__/fixtures";

const { mockGenerate } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class GoogleGenAI {
    models = { generateContent: mockGenerate };
  },
}));

describe("ai-generation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateTrip", () => {
    it("parses valid JSON response from Gemini", async () => {
      mockGenerate.mockResolvedValue({
        text: JSON.stringify(validTripResponse),
      });

      const result = await generateTrip(validTripInput);
      expect(result).toEqual(validTripResponse);
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it("strips markdown code fences before parsing", async () => {
      mockGenerate.mockResolvedValue({
        text: "```json\n" + JSON.stringify(validTripResponse) + "\n```",
      });

      const result = await generateTrip(validTripInput);
      expect(result.trip.title).toBe("東京五日遊");
    });

    it("retries on Zod validation failure then succeeds", async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: JSON.stringify({ trip: { title: "" } }),
        })
        .mockResolvedValueOnce({
          text: JSON.stringify(validTripResponse),
        });

      const result = await generateTrip(validTripInput);
      expect(result).toEqual(validTripResponse);
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it("retries when generated days do not match the requested duration", async () => {
      const twoDayInput = {
        ...validTripInput,
        endDate: "2026-04-02",
        days: 2,
        nights: 1,
      };
      const twoDayResponse = {
        trip: {
          title: "東京二日遊",
          days: [
            validTripDay,
            {
              ...validTripDay,
              day: 2,
              date: "2026-04-02",
              events: [
                {
                  ...validTripEvent,
                  id: VALID_EVENT_ID_2,
                  title: "上野公園",
                  sort_order: 1,
                },
              ],
            },
          ],
        },
      };

      mockGenerate
        .mockResolvedValueOnce({
          text: JSON.stringify(validTripResponse),
        })
        .mockResolvedValueOnce({
          text: JSON.stringify(twoDayResponse),
        });

      const result = await generateTrip(twoDayInput);

      expect(result).toEqual(twoDayResponse);
      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(mockGenerate.mock.calls[1][0].contents).toContain(
        "Expected 2 days, received 1."
      );
    });

    it("throws AIValidationError after exhausting retries", async () => {
      mockGenerate.mockResolvedValue({
        text: JSON.stringify({ trip: { title: "" } }),
      });

      await expect(generateTrip(validTripInput)).rejects.toBeInstanceOf(
        AIValidationError
      );
      expect(mockGenerate).toHaveBeenCalledTimes(3);
    });

    it("throws AIRateLimitError on 429 status", async () => {
      mockGenerate.mockRejectedValue({ status: 429, message: "Rate limit" });
      await expect(generateTrip(validTripInput)).rejects.toBeInstanceOf(
        AIRateLimitError
      );
    });
  });

  describe("generateAlternatives", () => {
    const alternatives = [
      validTripEvent,
      { ...validTripEvent, id: VALID_EVENT_ID_2, title: "晴空塔" },
      { ...validTripEvent, id: VALID_EVENT_ID_3, title: "上野公園" },
    ];

    it("returns exactly 3 validated alternatives", async () => {
      mockGenerate.mockResolvedValue({
        text: JSON.stringify(alternatives),
      });

      const result = await generateAlternatives(
        validTripEvent,
        [],
        "2026-04-01"
      );
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe("淺草寺");
    });

    it("throws AIValidationError when alternatives are invalid", async () => {
      mockGenerate.mockResolvedValue({
        text: JSON.stringify([validTripEvent]),
      });

      await expect(
        generateAlternatives(validTripEvent, [], "2026-04-01")
      ).rejects.toBeInstanceOf(AIValidationError);
    });
  });
});
