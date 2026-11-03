import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getClaims: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

const mockCreateClient = vi.mocked(createClient);

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: mocks.getUser,
        getClaims: mocks.getClaims,
      },
    });
  });

  it("validates the session with auth.getUser for server-side authorization", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "traveler@example.com",
          user_metadata: { name: "Traveler" },
        },
      },
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "user-1",
      email: "traveler@example.com",
      user_metadata: { name: "Traveler" },
    });
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });

  it("returns null when the Auth server does not return a user", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
