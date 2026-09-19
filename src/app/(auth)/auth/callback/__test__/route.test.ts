import { describe, it, expect, vi, beforeEach } from "vitest";

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession,
    },
  })),
}));

import { GET } from "@/app/(auth)/auth/callback/route";

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("redirects to safe in-app next path after exchanging the auth code", async () => {
    const response = await GET(
      new Request(
        "https://travel.example/auth/callback?code=auth-code&next=%2Ftrips%2Ftrip-1%3Ftab%3Dmap%23day-2"
      )
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
    expect(response.headers.get("location")).toBe(
      "https://travel.example/trips/trip-1?tab=map#day-2"
    );
  });

  it.each([
    ["@evil.example"],
    ["https://evil.example/phish"],
    ["//evil.example/phish"],
    ["/\\evil.example/phish"],
  ])("falls back to home for unsafe next path %s", async (next) => {
    const response = await GET(
      new Request(
        `https://travel.example/auth/callback?code=auth-code&next=${encodeURIComponent(
          next
        )}`
      )
    );

    expect(response.headers.get("location")).toBe("https://travel.example/");
  });

  it("redirects to login when session exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("bad code") });

    const response = await GET(
      new Request(
        "https://travel.example/auth/callback?code=bad-code&next=%2Ftrips%2Ftrip-1"
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://travel.example/login?error=auth_callback_failed"
    );
  });
});
