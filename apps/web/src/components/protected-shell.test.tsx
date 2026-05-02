import React from "react";
import { render, screen } from "@testing-library/react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ProtectedShell } from "./protected-shell";

vi.mock("@/hooks/use-protected-user", () => ({
  useProtectedUser: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

describe("ProtectedShell", () => {
  afterEach(() => {
    vi.mocked(useProtectedUser).mockReset();
  });

  it("renders the loading state while the session is being restored", () => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "loading"
    });

    render(<ProtectedShell mode="dashboard" />);

    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
  });

  it("shows company dashboard actions for company users", () => {
    vi.mocked(useProtectedUser).mockReturnValue({
      status: "ready",
      user: {
        id: "company-1",
        email: "hello@kampunglabs.my",
        name: "Kampung Labs",
        role: "company"
      }
    });

    render(<ProtectedShell mode="dashboard" />);

    expect(screen.getByText(/company dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create job draft/i })).toBeInTheDocument();
  });
});
