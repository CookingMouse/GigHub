"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { startTransition, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, jobsApi } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace-layout";
import {
  WizardProvider,
  useWizardDerivedFormInput,
  useWizardState,
  wizardActions
} from "./wizard-context";
import { StepIndustry } from "./steps/step-industry";
import { StepDepartment } from "./steps/step-department";
import { StepJobTitle } from "./steps/step-job-title";
import { StepJobDetails } from "./steps/step-job-details";
import { StepWorkLocation } from "./steps/step-work-location";
import { StepSkills } from "./steps/step-skills";

const stepLabels = ["Industry", "Department", "Title", "Details", "Location", "Skills"] as const;

const WizardBody = () => {
  const { state, dispatch } = useWizardState();
  const buildDerivedInput = useWizardDerivedFormInput();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const goNext = () => dispatch(wizardActions.nextStep());
  const goBack = () => dispatch(wizardActions.prevStep());

  const handleCreate = () => {
    setErrorMessage(null);

    try {
      const payload = buildDerivedInput();

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
    } catch (error) {
      setErrorMessage("Unable to prepare the draft payload.");
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <StepIndustry />;
      case 2:
        return <StepDepartment />;
      case 3:
        return <StepJobTitle />;
      case 4:
        return <StepJobDetails onNext={goNext} />;
      case 5:
        return <StepWorkLocation onBack={goBack} onNext={goNext} />;
      case 6:
        return <StepSkills isSubmitting={isSubmitting} onBack={goBack} onSubmit={handleCreate} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        {stepLabels.map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6;
          const active = state.currentStep === stepNumber;
          const complete = state.currentStep > stepNumber;

          return (
            <div
              key={label}
              style={{
                borderRadius: 999,
                border: active ? "1px solid #1D4ED8" : "1px solid #E5E7EB",
                background: active ? "#EFF6FF" : complete ? "#F3F4F6" : "#FFFFFF",
                color: "#111827",
                padding: "8px 12px"
              }}
            >
              {stepNumber}. {label}
            </div>
          );
        })}
      </div>

      {renderStep()}

      {errorMessage ? (
        <div className="callout-warning" style={{ marginTop: 20 }}>
          <strong>Action Required</strong>
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </>
  );
};

export const CompanyJobWizardPage = () => {
  const session = useProtectedUser("company");

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Loading company workspace</h1>
        <p className="muted">Preparing the guided job creation wizard.</p>
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

  return (
    <WorkspaceLayout
      user={session.user}
      title="Create New Project"
      subtitle="Use the guided wizard to structure the job draft before publishing."
    >
      <WizardProvider>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>GigHub Job Posting Wizard</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Step through industry, role, details, location, and skills.
            </p>
          </div>
          <Link className="button-secondary" href="/jobs">
            Cancel & Exit
          </Link>
        </div>

        <div style={{ maxWidth: "1000px" }}>
          <WizardBody />
        </div>
      </WizardProvider>
    </WorkspaceLayout>
  );
};
