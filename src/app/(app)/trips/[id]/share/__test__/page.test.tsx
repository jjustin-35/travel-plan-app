import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShareManagePage from "../page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "trip-1" }),
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

vi.mock("@/components/trip/PdfDownloadButton", () => ({
  PdfDownloadButton: () => <button type="button">Export PDF</button>,
}));

const share = {
  id: "share-1",
  shareToken: "token-1",
  permission: "read",
  createdAt: "2026-07-24T00:00:00.000Z",
  isActive: true,
};

const trip = {
  id: "trip-1",
  title: "Tokyo Trip",
  destination: "Tokyo",
  startDate: "2026-08-01",
  endDate: "2026-08-03",
  days: [],
};

function mockInitialFetches(deleteResponse: Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();

      if (url === "/api/trips/trip-1/shares") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ shares: [share] }),
        } as Response);
      }

      if (url === "/api/trips/trip-1") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ trip }),
        } as Response);
      }

      if (url === "/api/trips/trip-1/shares/share-1") {
        return Promise.resolve(deleteResponse);
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    })
  );
}

describe("ShareManagePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps a share link visible when revocation fails", async () => {
    const user = userEvent.setup();
    mockInitialFetches({ ok: false } as Response);

    render(<ShareManagePage />);

    expect(await screen.findByText(/\/share\/token-1/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "✕" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("無法停用分享連結");
    expect(screen.getByText(/\/share\/token-1/)).toBeInTheDocument();
  });

  it("removes a share link after successful revocation", async () => {
    const user = userEvent.setup();
    mockInitialFetches({ ok: true } as Response);

    render(<ShareManagePage />);

    expect(await screen.findByText(/\/share\/token-1/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "✕" }));

    await waitFor(() => {
      expect(screen.queryByText(/\/share\/token-1/)).not.toBeInTheDocument();
    });
  });
});
