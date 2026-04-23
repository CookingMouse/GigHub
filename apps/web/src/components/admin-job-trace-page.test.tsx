import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { adminApi } from "@/lib/api";
import { AdminJobTracePage } from "./admin-job-trace-page";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    adminApi: {
      getJobTrace: vi.fn()
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

describe("AdminJobTracePage", () => {
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
    vi.mocked(adminApi.getJobTrace).mockReset();
  });

  it("renders a job trace with milestone and audit context", async () => {
    vi.mocked(adminApi.getJobTrace).mockResolvedValue({
      trace: {
        id: "job-1",
        title: "Design campaign landing page",
        status: "COMPLETED",
        companyName: "Kampung Labs",
        freelancerName: "Aina Musa",
        escrow: {
          status: "FULLY_RELEASED",
          fundedAmount: 2400,
          releasedAmount: 2400,
          provider: "mock",
          providerReference: "mock-intent-1",
          fundedAt: "2026-04-02T08:00:00.000Z",
          releasedAt: "2026-04-20T12:00:00.000Z"
        },
        milestones: [
          {
            id: "milestone-1",
            sequence: 1,
            title: "Design delivery",
            description: "Final design file and notes",
            amount: 2400,
            status: "RELEASED",
            dueAt: "2026-04-20T00:00:00.000Z",
            submittedAt: "2026-04-18T10:00:00.000Z",
            approvedAt: null,
            releasedAt: "2026-04-20T12:00:00.000Z",
            reviewDueAt: null,
            revisionRequestedAt: null,
            createdAt: "2026-04-01T08:00:00.000Z",
            updatedAt: "2026-04-20T12:00:00.000Z",
            latestSubmission: null,
            latestDecision: null,
            activeDispute: null
          }
        ],
        glmDecisions: [],
        auditLogs: [
          {
            id: "audit-1",
            actorName: "Kampung Labs",
            actorEmail: "hello@kampunglabs.my",
            entityType: "job",
            entityId: "job-1",
            eventType: "job.completed",
            payload: {},
            createdAt: "2026-04-20T12:00:00.000Z"
          }
        ]
      }
    });

    render(<AdminJobTracePage jobId="job-1" />);

    expect(await screen.findByText(/design campaign landing page/i)).toBeInTheDocument();
    expect(screen.getByText(/design delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/job.completed/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(adminApi.getJobTrace).toHaveBeenCalledWith("job-1");
    });
  });
});
