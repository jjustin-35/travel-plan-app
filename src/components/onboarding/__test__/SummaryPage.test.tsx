import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SummaryPage } from "@/components/onboarding/SummaryPage";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { tripKeys } from "@/lib/api/trips";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderSummary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SummaryPage />
    </QueryClientProvider>
  );
  return { ...view, invalidateSpy };
}

describe("SummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().setDestination("東京");
    useOnboardingStore.getState().setDates("2026-04-01", "2026-04-05");
    useOnboardingStore.getState().setTripType("自由行");
    useOnboardingStore.getState().setBudgetRange("中等");
  });

  it("renders summary of onboarding answers", () => {
    renderSummary();
    expect(screen.getByText("東京")).toBeInTheDocument();
    expect(screen.getByText(/5天4夜/)).toBeInTheDocument();
    expect(screen.getByText("自由行")).toBeInTheDocument();
    expect(screen.getByText("中等")).toBeInTheDocument();
  });

  it("submits trip and navigates on success", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ trip: { id: "trip-1" } }),
      })
    );

    const { invalidateSpy } = renderSummary();
    await user.click(screen.getByRole("button", { name: /開始規劃行程/ }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/trips/trip-1");
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tripKeys.all });
    expect(useOnboardingStore.getState().destination).toBe("");

    vi.unstubAllGlobals();
  });

  it("shows error when submission fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "伺服器錯誤" }),
      })
    );

    renderSummary();
    await user.click(screen.getByRole("button", { name: /開始規劃行程/ }));

    await waitFor(() => {
      expect(screen.getByText("伺服器錯誤")).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});
