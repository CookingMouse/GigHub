"use client";

import { loginSchema } from "@gighub/shared";
import { useRouter } from "next/navigation";
import React from "react";
import { FormEvent, startTransition, useState } from "react";
import { ApiRequestError, authApi } from "@/lib/api";

export const LoginForm = () => {
  const router = useRouter();
  const [role, setRole] = useState<"freelancer" | "company">("freelancer");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      role
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Please check your credentials.");
      return;
    }

    setIsSubmitting(true);

    startTransition(async () => {
      try {
        await authApi.login(parsed.data);
        router.replace("/dashboard");
        router.refresh();
      }
 catch (error) {
        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to sign in right now.");
        }
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <fieldset className="role-switch">
        <legend>Login as</legend>
        <label>
          <input
            checked={role === "freelancer"}
            name="role"
            onChange={() => setRole("freelancer")}
            type="radio"
            value="freelancer"
          />
          <span>Freelancer</span>
        </label>
        <label>
          <input
            checked={role === "company"}
            name="role"
            onChange={() => setRole("company")}
            type="radio"
            value="company"
          />
          <span>Company</span>
        </label>
      </fieldset>

      <label className="field">
        <span>Email</span>
        <input autoComplete="email" name="email" placeholder="name@example.com" type="email" />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          name="password"
          placeholder="Enter your password"
          type="password"
        />
      </label>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <button className="button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
};
