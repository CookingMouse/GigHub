"use client";

import React from "react";
import { JobDraftForm } from "@/components/job-draft-form";
import { useWizardState, wizardActions } from "../wizard-context";

type StepJobDetailsProps = {
  onNext: () => void;
};

export const StepJobDetails = ({ onNext }: StepJobDetailsProps) => {
  const { state, dispatch } = useWizardState();

  return (
    <JobDraftForm
      values={state.formValues}
      onChange={(field, value) => dispatch(wizardActions.setFormField(field, value))}
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
      submitLabel="Continue to location"
      footer={<span style={{ fontSize: 13, color: "#6B7280" }}>Step 4 of 6</span>}
    />
  );
};
