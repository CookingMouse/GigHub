import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ProtectedShell } from "./protected-shell";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    refresh: vi.fn()
  })
}));

describe("ProtectedShell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    replace.mockReset();
  });

  it("redirects to login when the session cannot be restored", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          code: "AUTH_REQUIRED",
          message: "Unauthorized",
          requestId: "req-1"
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          code: "AUTH_REQUIRED",
          message: "Unauthorized",
          requestId: "req-2"
        })
      } as Response);

    render(<ProtectedShell mode="dashboard" />);

    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });

    fetchMock.mockRestore();
  });
});
