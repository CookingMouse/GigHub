import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { requestsApi } from "@/lib/api";
import { FreelancerRequestsPage } from "./freelancer-requests-page";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

let mockPathname = "/freelancer/requests";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

describe("FreelancerRequestsPage", () => {
  afterEach(() => {
    mockPathname = "/freelancer/requests";
    vi.mocked(useProtectedUser).mockReset();
    vi.restoreAllMocks();
  });

  it("renders applications and invitations without the open-job browse section", async () => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "freelancer-1",
        email: "aina@example.com",
        name: "Aina Musa",
        role: "freelancer"
      }
    });

    vi.spyOn(requestsApi, "listFreelancerRequests").mockResolvedValue({
      applications: [
        {
          id: "application-1",
          jobId: "job-1",
          jobTitle: "Landing page refresh",
          status: "PENDING",
          coverNote: "Sharing my latest portfolio.",
          appliedAt: "2026-04-22T09:00:00.000Z",
          updatedAt: "2026-04-23T09:00:00.000Z"
        }
      ],
      invitations: [
        {
          id: "invitation-1",
          jobId: "job-2",
          jobTitle: "Campaign microsite rebuild",
          companyId: "company-1",
          companyName: "Kampung Labs",
          note: "We would like to invite you.",
          status: "PENDING",
          createdAt: "2026-04-24T09:00:00.000Z",
          respondedAt: null
        }
      ]
    });
    vi.spyOn(requestsApi, "respondInvitation").mockResolvedValue({
      success: true
    });

    render(<FreelancerRequestsPage />);

    expect(await screen.findByText(/submitted requests/i)).toBeInTheDocument();
    expect(screen.getByText(/invitations from companies/i)).toBeInTheDocument();
    expect(screen.getByText(/landing page refresh/i)).toBeInTheDocument();
    expect(screen.getByText(/campaign microsite rebuild/i)).toBeInTheDocument();
    expect(screen.queryByText(/open jobs you can apply for/i)).not.toBeInTheDocument();
  });

  it("keeps invitation actions working after the page split", async () => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "freelancer-1",
        email: "aina@example.com",
        name: "Aina Musa",
        role: "freelancer"
      }
    });

    vi.spyOn(requestsApi, "listFreelancerRequests")
      .mockResolvedValueOnce({
        applications: [],
        invitations: [
          {
            id: "invitation-1",
            jobId: "job-2",
            jobTitle: "Campaign microsite rebuild",
            companyId: "company-1",
            companyName: "Kampung Labs",
            note: "We would like to invite you.",
            status: "PENDING",
            createdAt: "2026-04-24T09:00:00.000Z",
            respondedAt: null
          }
        ]
      })
      .mockResolvedValueOnce({
        applications: [],
        invitations: [
          {
            id: "invitation-1",
            jobId: "job-2",
            companyId: "company-1",
            companyName: "Kampung Labs",
            jobTitle: "Campaign microsite rebuild",
            note: "We would like to invite you.",
            status: "ACCEPTED",
            createdAt: "2026-04-24T09:00:00.000Z",
            respondedAt: "2026-04-24T10:00:00.000Z"
          }
        ]
      });
    vi.spyOn(requestsApi, "respondInvitation").mockResolvedValue({
      success: true
    });

    render(<FreelancerRequestsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /accept/i }));

    await waitFor(() => {
      expect(requestsApi.respondInvitation).toHaveBeenCalledWith("invitation-1", {
        action: "accept"
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/status: accepted/i)).toBeInTheDocument();
    });
  });
});
