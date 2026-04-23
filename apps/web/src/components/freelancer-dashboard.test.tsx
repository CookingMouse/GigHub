import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { FreelancerDashboard } from "./freelancer-dashboard";
import { freelancerWorkspaceApi } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    freelancerWorkspaceApi: {
      listJobs: vi.fn()
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

describe("FreelancerDashboard", () => {
  afterEach(() => {
    vi.mocked(freelancerWorkspaceApi.listJobs).mockReset();
  });

  it("renders assigned milestone cards for the freelancer workspace", async () => {
    vi.mocked(freelancerWorkspaceApi.listJobs).mockResolvedValue({
      jobs: [
        {
          id: "job-1",
          title: "Campaign microsite rebuild",
          status: "IN_PROGRESS",
          companyName: "Kampung Labs",
          milestones: [
            {
              id: "milestone-1",
              sequence: 1,
              title: "Design pass",
              description: "Initial screen layout",
              status: "SUBMITTED",
              dueAt: "2026-05-02T00:00:00.000Z",
              revisionCount: 1,
              remainingRevisions: 2
            }
          ]
        }
      ]
    });

    render(
      <FreelancerDashboard
        user={{
          id: "freelancer-1",
          email: "aina@example.com",
          name: "Aina Musa",
          role: "freelancer"
        }}
      />
    );

    expect(await screen.findByText(/campaign microsite rebuild/i)).toBeInTheDocument();
    expect(screen.getByText(/milestone 1/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open milestone/i })).toHaveAttribute(
      "href",
      "/freelancer/milestones/milestone-1"
    );
    await waitFor(() => {
      expect(freelancerWorkspaceApi.listJobs).toHaveBeenCalledTimes(1);
    });
  });
});
