import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { healthApi } from "@/lib/api";
import { DemoReadinessPage } from "./demo-readiness-page";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    healthApi: {
      readiness: vi.fn()
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

describe("DemoReadinessPage", () => {
  afterEach(() => {
    vi.mocked(healthApi.readiness).mockReset();
  });

  it("renders readiness checks and demo account credentials", async () => {
    vi.mocked(healthApi.readiness).mockResolvedValue({
      readiness: {
        status: "ready",
        generatedAt: "2026-04-23T10:00:00.000Z",
        providers: {
          glm: "mock",
          payments: "mock",
          storage: "local"
        },
        checks: [
          {
            name: "database",
            status: "pass",
            detail: "PostgreSQL query succeeded."
          },
          {
            name: "redis",
            status: "pass",
            detail: "Redis ping succeeded."
          }
        ],
        demoAccounts: [
          {
            role: "company",
            email: "company@gighub.demo",
            password: "Company123!",
            label: "Demo company"
          }
        ],
        demoFlow: ["Sign in as the demo company."]
      }
    });

    render(<DemoReadinessPage />);

    expect(await screen.findByText(/system readiness and demo flow/i)).toBeInTheDocument();
    expect(screen.getByText(/company@gighub.demo/i)).toBeInTheDocument();
    expect(screen.getByText(/glm: mock/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(healthApi.readiness).toHaveBeenCalledTimes(1);
    });
  });
});
