"use client";

import { ZodError } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { startTransition, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, jobsApi } from "@/lib/api";
import { emptyJobFormValues, jobFormValuesToInput, type JobFormValues } from "@/lib/job-form";
import { CompanyWorkspaceShell } from "./company-workspace-shell";
import { JobDraftForm } from "./job-draft-form";

export const CompanyJobCreatePage = () => {
  const session = useProtectedUser("company");
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>(emptyJobFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Loading company workspace</h1>
        <p className="muted">Preparing the structured brief builder.</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Workspace unavailable</h1>
        <p className="muted">{session.message}</p>
        <Link className="button-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    );
  }

  const updateField = (field: keyof JobFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    let payload;

    try {
      payload = jobFormValuesToInput(values);
    } catch (error) {
      if (error instanceof ZodError) {
        setErrorMessage(error.issues[0]?.message ?? "Check the brief details before saving.");
        return;
      }

      setErrorMessage("Unable to prepare the draft payload.");
      return;
    }

    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.create(payload);
        router.replace(`/jobs/${response.job.id}`);
        router.refresh();
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to create the draft right now.");
        }
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <CompanyWorkspaceShell
      actions={
        <>
          <Link className="button-secondary" href="/jobs">
            Back to jobs
          </Link>
        </>
      }
      companyEmail={session.user.email}
      companyName={session.user.name}
      description="Capture the project in a structured format so later validation, milestone checks, and dispute handling all reference the same source of truth."
      title="New job draft"
    >
      <section className="inline-panel">
        <h2>Draft requirements</h2>
        <p className="muted">
          Save the draft first. Validation comes next and will score the brief against the sections
          below.
        </p>
      </section>

      <JobDraftForm
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onChange={updateField}
        onSubmit={handleSubmit}
        submitLabel="Save draft"
        values={values}
      />
    </CompanyWorkspaceShell>
  );
};
