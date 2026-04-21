import React from "react";
import { render, screen } from "@testing-library/react";
import { RegisterForm } from "./register-form";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    refresh
  })
}));

describe("RegisterForm", () => {
  it("renders the register fields", () => {
    render(<RegisterForm />);

    expect(screen.getByText(/account type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });
});
