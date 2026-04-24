import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { requestsApi } from "@/lib/api";
import { FreelancerBrowseJobsPage } from "./freelancer-browse-jobs-page";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

let mockPathname = "/freelancer/browse-jobs";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

describe("FreelancerBrowseJobsPage", () => {
  afterEach(() => {
    mockPathname = "/freelancer/browse-jobs";
    vi.mocked(useProtectedUser).mockReset();
    vi.restoreAllMocks();
  });

  it("renders browse jobs, shows nav order, and reloads after applying", async () => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "freelancer-1",
        email: "aina@example.com",
        name: "Aina Musa",
        role: "freelancer"
      }
    });

    vi.spyOn(requestsApi, "listAvailability").mockResolvedValue({
      jobs: [
        {
          id: "job-1",
          title: "SME landing page refresh",
          companyName: "Kampung Labs",
          budget: 1800,
          milestoneCount: 2,
          publishedAt: "2026-04-24T09:00:00.000Z"
        },
        {
          id: "job-2",
          title: "Brand audit pack",
          companyName: "Northstar Studio",
          budget: 2500,
          milestoneCount: 3,
          publishedAt: "2026-04-23T09:00:00.000Z"
        }
      ]
    });
    vi.spyOn(requestsApi, "listFreelancerRequests")
      .mockResolvedValueOnce({
        applications: [
          {
            id: "application-2",
            jobId: "job-2",
            jobTitle: "Brand audit pack",
            status: "PENDING",
            coverNote: "",
            appliedAt: "2026-04-24T10:00:00.000Z",
            updatedAt: "2026-04-24T10:00:00.000Z"
          }
        ],
        invitations: []
      })
      .mockResolvedValueOnce({
        applications: [
          {
            id: "application-1",
            jobId: "job-1",
            jobTitle: "SME landing page refresh",
            status: "PENDING",
            coverNote: "",
            appliedAt: "2026-04-24T11:00:00.000Z",
            updatedAt: "2026-04-24T11:00:00.000Z"
          },
          {
            id: "application-2",
            jobId: "job-2",
            jobTitle: "Brand audit pack",
            status: "PENDING",
            coverNote: "",
            appliedAt: "2026-04-24T10:00:00.000Z",
            updatedAt: "2026-04-24T10:00:00.000Z"
          }
        ],
        invitations: []
      });
    vi.spyOn(requestsApi, "applyToJob").mockResolvedValue({
      success: true
    });

    render(<FreelancerBrowseJobsPage />);

    expect(await screen.findByText(/currently applyable jobs/i)).toBeInTheDocument();

    const navLinks = screen.getAllByRole("link").slice(0, 4).map((link) => link.textContent);
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go forward/i })).toBeInTheDocument();
    expect(navLinks).toEqual(["Dashboard", "Browse Job", "Job Request", "Active Work"]);

    expect(screen.getByText(/sme landing page refresh/i)).toBeInTheDocument();
    expect(screen.getByText(/brand audit pack/i)).toBeInTheDocument();
    expect(screen.getByText(/application pending/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /already applied/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => {
      expect(requestsApi.applyToJob).toHaveBeenCalledWith("job-1", { coverNote: "" });
    });

    await waitFor(() => {
      expect(requestsApi.listFreelancerRequests).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^apply$/i })).not.toBeInTheDocument();
    });
  });

  it("supports search, sort, budget filters, and clearing filters", async () => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "freelancer-1",
        email: "aina@example.com",
        name: "Aina Musa",
        role: "freelancer"
      }
    });

    vi.spyOn(requestsApi, "listAvailability").mockResolvedValue({
      jobs: [
        {
          id: "job-1",
          title: "Landing page refresh",
          companyName: "Kampung Labs",
          budget: 1800,
          milestoneCount: 2,
          publishedAt: "2026-04-22T09:00:00.000Z"
        },
        {
          id: "job-2",
          title: "Analytics dashboard polish",
          companyName: "Northstar Studio",
          budget: 3200,
          milestoneCount: 4,
          publishedAt: "2026-04-24T09:00:00.000Z"
        },
        {
          id: "job-3",
          title: "Email campaign cleanup",
          companyName: "Pine & Co",
          budget: 1200,
          milestoneCount: 1,
          publishedAt: "2026-04-23T09:00:00.000Z"
        }
      ]
    });
    vi.spyOn(requestsApi, "listFreelancerRequests").mockResolvedValue({
      applications: [],
      invitations: []
    });
    vi.spyOn(requestsApi, "applyToJob").mockResolvedValue({
      success: true
    });

    render(<FreelancerBrowseJobsPage />);

    const resultsRegion = await screen.findByLabelText(/browse job results/i);
    const getVisibleTitles = () =>
      within(resultsRegion).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

    expect(getVisibleTitles()).toEqual([
      "Analytics dashboard polish",
      "Email campaign cleanup",
      "Landing page refresh"
    ]);

    fireEvent.change(screen.getByLabelText(/sort/i), {
      target: { value: "budget-desc" }
    });

    await waitFor(() => {
      expect(getVisibleTitles()).toEqual([
        "Analytics dashboard polish",
        "Landing page refresh",
        "Email campaign cleanup"
      ]);
    });

    fireEvent.change(screen.getByLabelText(/max budget/i), {
      target: { value: "1800" }
    });

    await waitFor(() => {
      expect(getVisibleTitles()).toEqual(["Landing page refresh", "Email campaign cleanup"]);
    });

    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: "kampung" }
    });

    await waitFor(() => {
      expect(getVisibleTitles()).toEqual(["Landing page refresh"]);
    });

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    await waitFor(() => {
      expect(getVisibleTitles()).toEqual([
        "Analytics dashboard polish",
        "Email campaign cleanup",
        "Landing page refresh"
      ]);
    });
  });
});
