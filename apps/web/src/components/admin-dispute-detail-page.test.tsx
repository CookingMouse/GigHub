import React from "react";
import { render, screen } from "@testing-library/react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { adminApi } from "@/lib/api";
import { AdminDisputeDetailPage } from "./admin-dispute-detail-page";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    adminApi: {
      getDispute: vi.fn(),
      resolveDispute: vi.fn()
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

describe("AdminDisputeDetailPage", () => {
  beforeEach(() => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "admin-1",
        email: "admin@gighub.my",
        name: "GigHub Admin",
        role: "admin"
      }
    });
  });

  afterEach(() => {
    vi.mocked(useProtectedUser).mockReset();
    vi.mocked(adminApi.getDispute).mockReset();
    vi.mocked(adminApi.resolveDispute).mockReset();
  });

  it("renders moderation actions for an open dispute", async () => {
    vi.mocked(adminApi.getDispute).mockResolvedValue({
      dispute: {
        id: "dispute-1",
        status: "OPEN",
        rejectionReason: "The CTA hierarchy is missing from the delivery.",
        resolutionType: null,
        resolutionSummary: null,
        adminNote: null,
        openedAt: "2026-04-23T10:00:00.000Z",
        resolvedAt: null,
        job: {
          id: "job-1",
          title: "Campaign microsite rebuild",
          companyName: "Kampung Labs",
          freelancerName: "Aina Musa"
        },
        milestone: {
          id: "milestone-1",
          sequence: 1,
          title: "Design pass",
          description: "Initial design direction",
          amount: 1600,
          status: "DISPUTED",
          dueAt: "2026-05-02T00:00:00.000Z",
          submittedAt: "2026-04-23T10:00:00.000Z",
          approvedAt: null,
          releasedAt: null,
          reviewDueAt: "2026-04-26T10:00:00.000Z",
          revisionRequestedAt: null,
          createdAt: "2026-04-23T09:00:00.000Z",
          updatedAt: "2026-04-23T10:15:00.000Z",
          latestSubmission: {
            id: "submission-1",
            revision: 1,
            status: "DISPUTED",
            notes: "Submitted for review",
            reviewDecision: "COMPANY_REJECTED",
            rejectionReason: "The CTA hierarchy is missing from the delivery.",
            fileName: "delivery.pdf",
            fileFormat: "pdf",
            fileSizeBytes: 1024,
            fileHash: "abc123",
            wordCount: 200,
            dimensions: null,
            submittedAt: "2026-04-23T10:00:00.000Z",
            reviewedAt: "2026-04-23T10:15:00.000Z"
          },
          latestDecision: {
            decisionType: "MILESTONE_SCORING",
            overallScore: 82,
            passFail: "pass",
            recommendation: null,
            requirementScores: [],
            badFaithFlags: [],
            reasoning: "Mock GLM cleared the milestone for client review.",
            createdAt: "2026-04-23T10:01:00.000Z"
          },
          activeDispute: {
            id: "dispute-1",
            status: "OPEN",
            rejectionReason: "The CTA hierarchy is missing from the delivery.",
            resolutionType: null,
            resolutionSummary: null,
            adminNote: null,
            openedAt: "2026-04-23T10:00:00.000Z",
            resolvedAt: null,
            latestDecision: {
              decisionType: "DISPUTE_ANALYSIS",
              overallScore: null,
              passFail: null,
              recommendation: "release_funds",
              requirementScores: [],
              badFaithFlags: ["vague_rejection_reason"],
              reasoning: "Mock GLM found the rejection weaker than the milestone evidence.",
              createdAt: "2026-04-23T10:16:00.000Z"
            }
          }
        },
        submission: {
          id: "submission-1",
          revision: 1,
          status: "DISPUTED",
          notes: "Submitted for review",
          reviewDecision: "COMPANY_REJECTED",
          rejectionReason: "The CTA hierarchy is missing from the delivery.",
          fileName: "delivery.pdf",
          fileFormat: "pdf",
          fileSizeBytes: 1024,
          fileHash: "abc123",
          wordCount: 200,
          dimensions: null,
          submittedAt: "2026-04-23T10:00:00.000Z",
          reviewedAt: "2026-04-23T10:15:00.000Z"
        },
        milestoneDecision: {
          decisionType: "MILESTONE_SCORING",
          overallScore: 82,
          passFail: "pass",
          recommendation: null,
          requirementScores: [],
          badFaithFlags: [],
          reasoning: "Mock GLM cleared the milestone for client review.",
          createdAt: "2026-04-23T10:01:00.000Z"
        },
        disputeDecision: {
          decisionType: "DISPUTE_ANALYSIS",
          overallScore: null,
          passFail: null,
          recommendation: "release_funds",
          requirementScores: [],
          badFaithFlags: ["vague_rejection_reason"],
          reasoning: "Mock GLM found the rejection weaker than the milestone evidence.",
          createdAt: "2026-04-23T10:16:00.000Z"
        }
      }
    });

    render(<AdminDisputeDetailPage disputeId="dispute-1" />);

    expect(await screen.findByText(/close the dispute/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /release funds/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request revision/i })).toBeInTheDocument();
    expect(screen.getByText(/mocked glm arbitration output/i)).toBeInTheDocument();
  });
});
