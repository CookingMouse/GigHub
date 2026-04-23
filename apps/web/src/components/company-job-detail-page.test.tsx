import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import type { JobRecord } from "@gighub/shared";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { freelancersApi, jobsApi } from "@/lib/api";
import { CompanyJobDetailPage } from "./company-job-detail-page";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    jobsApi: {
      get: vi.fn(),
      update: vi.fn(),
      validate: vi.fn(),
      publish: vi.fn(),
      assign: vi.fn(),
      createEscrowIntent: vi.fn(),
      saveMilestones: vi.fn(),
      approveMilestone: vi.fn(),
      rejectMilestone: vi.fn(),
      runAutoReleaseCheck: vi.fn()
    },
    freelancersApi: {
      list: vi.fn()
    },
    paymentsApi: {
      simulateSuccess: vi.fn()
    }
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
    push: vi.fn()
  }),
  useParams: () => ({
    jobId: "job-1"
  })
}));

const companyJob: JobRecord = {
  id: "job-1",
  title: "Campaign microsite rebuild",
  budget: 3200,
  milestoneCount: 2,
  status: "IN_PROGRESS",
  publishedAt: "2026-04-23T09:00:00.000Z",
  assignedAt: "2026-04-23T09:30:00.000Z",
  createdAt: "2026-04-23T08:00:00.000Z",
  updatedAt: "2026-04-23T10:00:00.000Z",
  assignedFreelancer: {
    id: "freelancer-1",
    name: "Aina Musa",
    displayName: "Aina Musa",
    portfolioUrl: null,
    skills: ["UI Design"],
    hourlyRate: 120,
    ratingAverage: 4.8
  },
  escrow: {
    status: "PARTIALLY_RELEASED",
    fundedAmount: 3200,
    releasedAmount: 1600,
    provider: "mock",
    providerReference: "intent-1",
    fundedAt: "2026-04-23T09:40:00.000Z",
    releasedAt: null
  },
  milestones: [
    {
      id: "milestone-1",
      sequence: 1,
      title: "Design pass",
      description: "Initial design direction",
      amount: 1600,
      status: "UNDER_REVIEW",
      dueAt: "2026-05-02T00:00:00.000Z",
      submittedAt: "2026-04-23T10:00:00.000Z",
      approvedAt: null,
      releasedAt: null,
      reviewDueAt: "2099-04-26T10:00:00.000Z",
      revisionRequestedAt: null,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T10:00:00.000Z",
      latestSubmission: {
        id: "submission-1",
        revision: 1,
        status: "PENDING_REVIEW",
        notes: "Submitted for client review",
        reviewDecision: "GLM_PASS",
        rejectionReason: null,
        fileName: "delivery.pdf",
        fileFormat: "pdf",
        fileSizeBytes: 1024,
        fileHash: "abc123",
        wordCount: 220,
        dimensions: null,
        submittedAt: "2026-04-23T10:00:00.000Z",
        reviewedAt: null
      },
      latestDecision: {
        decisionType: "MILESTONE_SCORING",
        overallScore: 84,
        passFail: "pass",
        recommendation: null,
        requirementScores: [
          {
            requirement: "brief_coverage",
            score: 88
          }
        ],
        badFaithFlags: [],
        reasoning: "Mock GLM cleared this milestone for company review.",
        createdAt: "2026-04-23T10:01:00.000Z"
      },
      activeDispute: null
    }
  ],
  brief: {
    overview: "Deliver a mobile-first campaign microsite design.",
    scope: ["Design responsive sections"],
    deliverables: ["Figma file"],
    requirements: ["Use brand palette"],
    acceptanceCriteria: ["CTA hierarchy is clear"],
    timeline: {
      startDate: "2026-04-24",
      endDate: "2026-05-02",
      notes: "First review in three days."
    },
    updatedAt: "2026-04-23T10:00:00.000Z",
    validation: {
      score: 85,
      summary: "The brief is complete and publishable.",
      gaps: [],
      clarifyingQuestions: [],
      lastValidatedAt: "2026-04-23T08:30:00.000Z",
      isStale: false,
      canPublish: false
    }
  }
};

describe("CompanyJobDetailPage", () => {
  beforeEach(() => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "company-1",
        email: "hello@kampunglabs.my",
        name: "Kampung Labs",
        role: "company"
      }
    });
  });

  afterEach(() => {
    vi.mocked(useProtectedUser).mockReset();
    vi.mocked(jobsApi.get).mockReset();
    vi.mocked(freelancersApi.list).mockReset();
  });

  it("renders company review actions for milestones under review", async () => {
    vi.mocked(jobsApi.get).mockResolvedValue({
      job: companyJob
    });
    vi.mocked(freelancersApi.list).mockResolvedValue({
      freelancers: []
    });

    render(<CompanyJobDetailPage />);

    expect(await screen.findByText(/review milestone scoring and disputes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve and release/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject with reason/i })).toBeInTheDocument();
    expect(screen.getByText(/84\/100/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(jobsApi.get).toHaveBeenCalledWith("job-1");
    });
  });
});
