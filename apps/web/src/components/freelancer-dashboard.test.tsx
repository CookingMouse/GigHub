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
  }),
  usePathname: () => "/dashboard"
}));

const testUser = {
  id: "freelancer-1",
  email: "aina@example.com",
  name: "Aina Musa",
  role: "freelancer" as const
};

describe("FreelancerDashboard", () => {
  afterEach(() => {
    vi.mocked(freelancerWorkspaceApi.listJobs).mockReset();
    vi.mocked(freelancerWorkspaceApi.getIncome).mockReset();
    vi.mocked(freelancerWorkspaceApi.listJobMatches).mockReset();
  });

  it("renders the redesigned dashboard overview sections", async () => {
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
              status: "RELEASED",
              dueAt: "2026-05-02T00:00:00.000Z",
              reviewDueAt: null,
              revisionCount: 1,
              remainingRevisions: 2
            },
            {
              id: "milestone-2",
              sequence: 2,
              title: "Build and QA",
              description: "Frontend delivery",
              status: "UNDER_REVIEW",
              dueAt: "2026-05-06T00:00:00.000Z",
              reviewDueAt: "2026-05-08T00:00:00.000Z",
              revisionCount: 1,
              remainingRevisions: 2
            }
          ]
        },
        {
          id: "job-2",
          title: "Archived brand refresh",
          status: "COMPLETED",
          companyName: "Northstar Studio",
          milestones: [
            {
              id: "milestone-3",
              sequence: 1,
              title: "Final assets",
              description: "Completed deliverables",
              status: "RELEASED",
              dueAt: "2026-04-02T00:00:00.000Z",
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
        totalEarned: 5400,
        releasedMilestones: 3,
        completedJobs: 2,
        avgMilestoneValue: 1800,
        latestStatement: null
      },
      statements: [
        {
          id: "statement-1",
          freelancerId: "freelancer-1",
          periodStart: "2026-02-01T00:00:00.000Z",
          periodEnd: "2026-04-30T23:59:59.999Z",
          totalEarned: 5400,
          totalJobs: 2,
          totalMilestones: 3,
          avgMonthlyIncome: 1800,
          currency: "MYR",
          generatedAt: "2026-04-30T08:00:00.000Z",
          pdfStorageKey: null,
          verifyToken: "verify-1",
          glmNarrative: null,
          status: "GENERATED",
          platformServiceFee: 270,
          estimatedOperatingExpenses: 155.1,
          netIncome: 4974.9,
          socsoProvisioning: 39.8,
          epfProvisioning: 397.99,
          amountAfterStatutory: 4537.11,
          lineItems: [
            {
              id: "line-1",
              milestoneId: "milestone-0",
              jobTitle: "Landing page sprint",
              companyName: "Kampung Labs",
              amount: 1200,
              releasedAt: "2026-02-14T00:00:00.000Z",
              category: "Design"
            },
            {
              id: "line-2",
              milestoneId: "milestone-1",
              jobTitle: "Campaign microsite rebuild",
              companyName: "Kampung Labs",
              amount: 1800,
              releasedAt: "2026-03-12T00:00:00.000Z",
              category: "Development"
            },
            {
              id: "line-3",
              milestoneId: "milestone-2",
              jobTitle: "Campaign microsite rebuild",
              companyName: "Kampung Labs",
              amount: 2400,
              releasedAt: "2026-04-19T00:00:00.000Z",
              category: "Development"
            }
          ]
        }
      ]
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
        },
        {
          jobId: "job-open-2",
          title: "UI system audit",
          companyName: "Northstar Studio",
          budget: 1600,
          milestoneCount: 1,
          publishedAt: "2026-04-22T08:00:00.000Z",
          matchScore: 78,
          reasons: ["Portfolio profile is available for company review."],
          requiredSkills: ["Design systems"]
        }
      ]
    });

    render(<FreelancerDashboard user={testUser} />);

    expect(await screen.findByText(/current jobs and milestone progress/i)).toBeInTheDocument();
    expect(screen.getByText(/calendar and due-soon view/i)).toBeInTheDocument();
    expect(screen.getByText(/monthly earnings trend/i)).toBeInTheDocument();
    expect(screen.getByText(/total earned/i)).toBeInTheDocument();
    expect(screen.getByText(/pending reviews/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended jobs/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /campaign microsite rebuild/i })).toBeInTheDocument();
    expect(screen.queryByText(/archived brand refresh/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/build and qa/i)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /open current milestone/i })).toHaveAttribute(
      "href",
      "/freelancer/milestones/milestone-2"
    );
    expect(screen.getByText(/highest month/i)).toBeInTheDocument();
    expect(screen.getByText(/available in job request/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(freelancerWorkspaceApi.listJobs).toHaveBeenCalledTimes(1);
      expect(freelancerWorkspaceApi.getIncome).toHaveBeenCalledTimes(1);
      expect(freelancerWorkspaceApi.listJobMatches).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps work visible when the income section fails", async () => {
    vi.mocked(freelancerWorkspaceApi.listJobs).mockResolvedValue({
      jobs: [
        {
          id: "job-1",
          title: "Mobile web refresh",
          status: "IN_PROGRESS",
          companyName: "Kampung Labs",
          milestones: [
            {
              id: "milestone-1",
              sequence: 1,
              title: "Wireframe review",
              description: "Review pass",
              status: "IN_PROGRESS",
              dueAt: "2026-05-02T00:00:00.000Z",
              reviewDueAt: null,
              revisionCount: 0,
              remainingRevisions: 3
            }
          ]
        }
      ]
    });
    vi.mocked(freelancerWorkspaceApi.getIncome).mockRejectedValue(new Error("income failed"));
    vi.mocked(freelancerWorkspaceApi.listJobMatches).mockResolvedValue({
      matches: []
    });

    render(<FreelancerDashboard user={testUser} />);

    expect(await screen.findByRole("heading", { name: /mobile web refresh/i })).toBeInTheDocument();
    expect(await screen.findAllByText(/^income history unavailable$/i)).toHaveLength(2);
    expect(screen.getByText(/income history is unavailable right now/i)).toBeInTheDocument();
  });
});
