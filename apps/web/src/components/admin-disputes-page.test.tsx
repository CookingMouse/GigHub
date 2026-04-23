import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { adminApi } from "@/lib/api";
import { AdminDisputesPage } from "./admin-disputes-page";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    adminApi: {
      listDisputes: vi.fn()
    }
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

describe("AdminDisputesPage", () => {
  afterEach(() => {
    vi.mocked(adminApi.listDisputes).mockReset();
  });

  it("renders the dispute moderation queue", async () => {
    vi.mocked(adminApi.listDisputes).mockResolvedValue({
      disputes: [
        {
          id: "dispute-1",
          status: "OPEN",
          jobId: "job-1",
          jobTitle: "Campaign microsite rebuild",
          milestoneId: "milestone-1",
          milestoneTitle: "Design pass",
          companyName: "Kampung Labs",
          freelancerName: "Aina Musa",
          rejectionReason: "The submission is missing the approved CTA hierarchy.",
          recommendation: "request_revision",
          badFaithFlags: [],
          openedAt: "2026-04-23T10:00:00.000Z"
        }
      ]
    });

    render(
      <AdminDisputesPage
        user={{
          id: "admin-1",
          email: "admin@gighub.my",
          name: "GigHub Admin",
          role: "admin"
        }}
      />
    );

    expect(await screen.findByText(/admin dispute queue/i)).toBeInTheDocument();
    expect(screen.getByText(/campaign microsite rebuild/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review dispute/i })).toHaveAttribute(
      "href",
      "/admin/disputes/dispute-1"
    );

    await waitFor(() => {
      expect(adminApi.listDisputes).toHaveBeenCalledTimes(1);
    });
  });
});
