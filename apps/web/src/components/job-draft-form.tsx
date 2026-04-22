"use client";

import React, { type FormEvent, type ReactNode } from "react";
import type { JobFormValues } from "@/lib/job-form";

type JobDraftFormProps = {
  values: JobFormValues;
  onChange: (field: keyof JobFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  errorMessage?: string | null;
  footer?: ReactNode;
};

const FieldLabel = ({ children }: { children: ReactNode }) => <span>{children}</span>;

export const JobDraftForm = ({
  values,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  disabled = false,
  errorMessage,
  footer
}: JobDraftFormProps) => (
  <form className="job-form" onSubmit={onSubmit}>
    <div className="job-form-grid">
      <label className="field">
        <FieldLabel>Job title</FieldLabel>
        <input
          disabled={disabled}
          maxLength={160}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="e.g. Mobile-first landing page redesign"
          type="text"
          value={values.title}
        />
      </label>

      <label className="field">
        <FieldLabel>Budget (MYR)</FieldLabel>
        <input
          disabled={disabled}
          min="1"
          onChange={(event) => onChange("budget", event.target.value)}
          placeholder="3200"
          step="0.01"
          type="number"
          value={values.budget}
        />
      </label>

      <label className="field">
        <FieldLabel>Milestones</FieldLabel>
        <select
          className="field-select"
          disabled={disabled}
          onChange={(event) => onChange("milestoneCount", event.target.value)}
          value={values.milestoneCount}
        >
          {["1", "2", "3", "4", "5"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </div>

    <label className="field">
      <FieldLabel>Project overview</FieldLabel>
      <textarea
        disabled={disabled}
        onChange={(event) => onChange("overview", event.target.value)}
        placeholder="Explain the business context, target audience, and expected outcome."
        rows={6}
        value={values.overview}
      />
    </label>

    <div className="job-form-grid">
      <label className="field">
        <FieldLabel>Scope</FieldLabel>
        <textarea
          disabled={disabled}
          onChange={(event) => onChange("scopeText", event.target.value)}
          placeholder="One task per line"
          rows={6}
          value={values.scopeText}
        />
      </label>

      <label className="field">
        <FieldLabel>Deliverables</FieldLabel>
        <textarea
          disabled={disabled}
          onChange={(event) => onChange("deliverablesText", event.target.value)}
          placeholder="One deliverable per line"
          rows={6}
          value={values.deliverablesText}
        />
      </label>
    </div>

    <div className="job-form-grid">
      <label className="field">
        <FieldLabel>Requirements</FieldLabel>
        <textarea
          disabled={disabled}
          onChange={(event) => onChange("requirementsText", event.target.value)}
          placeholder="List tools, formats, references, or constraints"
          rows={5}
          value={values.requirementsText}
        />
      </label>

      <label className="field">
        <FieldLabel>Acceptance criteria</FieldLabel>
        <textarea
          disabled={disabled}
          onChange={(event) => onChange("acceptanceCriteriaText", event.target.value)}
          placeholder="List the pass conditions for the submission"
          rows={5}
          value={values.acceptanceCriteriaText}
        />
      </label>
    </div>

    <div className="job-form-grid">
      <label className="field">
        <FieldLabel>Timeline start</FieldLabel>
        <input
          disabled={disabled}
          onChange={(event) => onChange("timelineStartDate", event.target.value)}
          type="date"
          value={values.timelineStartDate}
        />
      </label>

      <label className="field">
        <FieldLabel>Timeline end</FieldLabel>
        <input
          disabled={disabled}
          onChange={(event) => onChange("timelineEndDate", event.target.value)}
          type="date"
          value={values.timelineEndDate}
        />
      </label>
    </div>

    <label className="field">
      <FieldLabel>Timeline notes</FieldLabel>
      <textarea
        disabled={disabled}
        onChange={(event) => onChange("timelineNotes", event.target.value)}
        placeholder="Add any review windows, timezone constraints, or delivery rules."
        rows={4}
        value={values.timelineNotes}
      />
    </label>

    {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

    <div className="job-form-actions">
      <button className="button-primary" disabled={disabled || isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
      {footer}
    </div>
  </form>
);
