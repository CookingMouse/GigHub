import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { adminApi } from "@/lib/api";
import { AdminAuditPage } from "./admin-audit-page";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    adminApi: {
      getAudit: vi.fn()
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

describe("AdminAuditPage", () => {
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
    vi.mocked(adminApi.getAudit).mockReset();
  });

  it("renders audit logs and income statement verification records", async () => {
    vi.mocked(adminApi.getAudit).mockResolvedValue({
      auditLogs: [
        {
          id: "audit-1",
          actorName: "Kampung Labs",
          actorEmail: "hello@kampunglabs.my",
          entityType: "job",
          entityId: "job-1",
          eventType: "job.completed",
          payload: {},
          createdAt: "2026-04-23T10:00:00.000Z"
        }
      ],
      incomeStatements: [
        {
          id: "statement-1",
          freelancerName: "Aina Musa",
          freelancerEmail: "aina@example.com",
          periodStart: "2026-04-01T00:00:00.000Z",
          periodEnd: "2026-04-30T23:59:59.999Z",
          totalEarned: 2400,
          totalJobs: 1,
          totalMilestones: 1,
          generatedAt: "2026-04-23T10:10:00.000Z",
          verifyToken: "verify-token-1",
          status: "GENERATED"
        }
      ]
    });

    render(<AdminAuditPage />);

    expect(await screen.findByText(/audit and verification/i)).toBeInTheDocument();
    expect(screen.getByText(/job.completed/i)).toBeInTheDocument();
    expect(screen.getByText(/aina musa/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(adminApi.getAudit).toHaveBeenCalledTimes(1);
    });
  });
});
