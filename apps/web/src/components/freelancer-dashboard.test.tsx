import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { FreelancerDashboard } from "./freelancer-dashboard";
import { freelancerWorkspaceApi } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    freelancerWorkspaceApi: {
      listJobs: vi.fn(),
      getIncome: vi.fn(),
      listJobMatches: vi.fn()
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
    vi.mocked(freelancerWorkspaceApi.getIncome).mockReset();
    vi.mocked(freelancerWorkspaceApi.listJobMatches).mockReset();
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
              reviewDueAt: null,
              revisionCount: 1,
              remainingRevisions: 2
            }
          ]
        }
      ]
    });
    vi.mocked(freelancerWorkspaceApi.getIncome).mockResolvedValue({
      summary: {
        totalEarned: 2400,
        releasedMilestones: 1,
        completedJobs: 1,
        avgMilestoneValue: 2400,
        latestStatement: null
      },
      statements: []
    });
    vi.mocked(freelancerWorkspaceApi.listJobMatches).mockResolvedValue({
      matches: [
        {
          jobId: "job-open-1",
          title: "Figma landing page design",
          companyName: "Kampung Labs",
          budget: 1800,
          milestoneCount: 2,
          publishedAt: "2026-04-21T08:00:00.000Z",
          matchScore: 84,
          reasons: ["Skill match: Figma"],
          requiredSkills: ["Figma"]
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
    expect(await screen.findByText(/escrow-backed earnings record/i)).toBeInTheDocument();
    expect(await screen.findByText(/figma landing page design/i)).toBeInTheDocument();
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
