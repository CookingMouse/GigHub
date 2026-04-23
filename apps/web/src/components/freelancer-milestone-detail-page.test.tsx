import React from "react";
import { render, screen } from "@testing-library/react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { freelancerWorkspaceApi } from "@/lib/api";
import { FreelancerMilestoneDetailPage } from "./freelancer-milestone-detail-page";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    freelancerWorkspaceApi: {
      getMilestone: vi.fn(),
      createSubmission: vi.fn()
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

const baseMilestone = {
  id: "milestone-1",
  sequence: 1,
  title: "Landing page delivery",
  description: "Deliver the approved design file",
  status: "SUBMITTED" as const,
  dueAt: "2026-05-02T00:00:00.000Z",
  job: {
    id: "job-1",
    title: "Campaign microsite rebuild",
    companyName: "Kampung Labs"
  },
  brief: {
    overview: "Deliver the approved layout and notes.",
    deliverables: ["Figma file", "Handoff notes"],
    acceptanceCriteria: ["Layout matches the approved structure"]
  },
  revisionCount: 1,
  remainingRevisions: 2,
  submissionHistory: []
};

describe("FreelancerMilestoneDetailPage", () => {
  beforeEach(() => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "freelancer-1",
        email: "aina@example.com",
        name: "Aina Musa",
        role: "freelancer"
      }
    });
  });

  afterEach(() => {
    vi.mocked(useProtectedUser).mockReset();
    vi.mocked(freelancerWorkspaceApi.getMilestone).mockReset();
    vi.mocked(freelancerWorkspaceApi.createSubmission).mockReset();
  });

  it("shows the upload form for an active milestone", async () => {
    vi.mocked(freelancerWorkspaceApi.getMilestone).mockResolvedValue({
      milestone: baseMilestone
    });

    render(<FreelancerMilestoneDetailPage milestoneId="milestone-1" />);

    expect(await screen.findByText(/upload milestone deliverable/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submission file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submission notes/i)).toBeInTheDocument();
  });

  it("shows the revision lock message when the cap is reached", async () => {
    vi.mocked(freelancerWorkspaceApi.getMilestone).mockResolvedValue({
      milestone: {
        ...baseMilestone,
        revisionCount: 3,
        remainingRevisions: 0
      }
    });

    render(<FreelancerMilestoneDetailPage milestoneId="milestone-1" />);

    expect(await screen.findByText(/three-revision limit has been reached/i)).toBeInTheDocument();
  });
});
