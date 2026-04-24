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

const companyAccent = "#1D4ED8";

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div style={{ marginBottom: 20, borderBottom: "1px solid #F3F4F6", paddingBottom: 12 }}>
    <h3 style={{ margin: 0, fontSize: 16, color: "#111827" }}>{title}</h3>
    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>{subtitle}</p>
  </div>
);

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
  <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
    {/* Basic Details */}
    <section className="inline-panel" style={{ padding: 24 }}>
      <SectionHeader 
        title="1. Core Information" 
        subtitle="Set the identity, budget, and high-level structure of your project." 
      />
      
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 20 }}>
        <label className="field">
          <span>Job Title</span>
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
          <span>Budget (MYR)</span>
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
          <span>Milestones</span>
          <select
            className="field-select"
            disabled={disabled}
            onChange={(event) => onChange("milestoneCount", event.target.value)}
            value={values.milestoneCount}
          >
            {["1", "2", "3", "4", "5"].map((value) => (
              <option key={value} value={value}>
                {value} {parseInt(value) === 1 ? "Phase" : "Phases"}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>

    {/* Project Core */}
    <section className="inline-panel" style={{ padding: 24 }}>
      <SectionHeader 
        title="2. Project Brief" 
        subtitle="Explain the mission and specify exactly what needs to be delivered." 
      />
      
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <label className="field">
          <span>Overview & Context</span>
          <textarea
            disabled={disabled}
            onChange={(event) => onChange("overview", event.target.value)}
            placeholder="What are we building? Who is it for? Why is this project important?"
            style={{ minHeight: 120 }}
            value={values.overview}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <label className="field">
            <span>Detailed Scope</span>
            <textarea
              disabled={disabled}
              onChange={(event) => onChange("scopeText", event.target.value)}
              placeholder="List specific tasks or technical requirements (one per line)..."
              style={{ minHeight: 160 }}
              value={values.scopeText}
            />
          </label>

          <label className="field">
            <span>Final Deliverables</span>
            <textarea
              disabled={disabled}
              onChange={(event) => onChange("deliverablesText", event.target.value)}
              placeholder="What tangible files or results will you receive (one per line)..."
              style={{ minHeight: 160 }}
              value={values.deliverablesText}
            />
          </label>
        </div>
      </div>
    </section>

    {/* Quality Control */}
    <section className="inline-panel" style={{ padding: 24 }}>
      <SectionHeader 
        title="3. Quality & Acceptance" 
        subtitle="Define the constraints and how you will judge the work quality." 
      />
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <label className="field">
          <span>Worker Requirements</span>
          <textarea
            disabled={disabled}
            onChange={(event) => onChange("requirementsText", event.target.value)}
            placeholder="e.g. Tools (Figma), Formats (.svg), or experience level..."
            style={{ minHeight: 140 }}
            value={values.requirementsText}
          />
        </label>

        <label className="field">
          <span>Acceptance Criteria</span>
          <textarea
            disabled={disabled}
            onChange={(event) => onChange("acceptanceCriteriaText", event.target.value)}
            placeholder="What conditions must be met for you to approve a milestone?"
            style={{ minHeight: 140 }}
            value={values.acceptanceCriteriaText}
          />
        </label>
      </div>
    </section>

    {/* Timeline */}
    <section className="inline-panel" style={{ padding: 24 }}>
      <SectionHeader 
        title="4. Timeline & Schedule" 
        subtitle="Establish the project window and any delivery constraints." 
      />
      
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <label className="field">
            <span>Target Start Date</span>
            <input
              disabled={disabled}
              onChange={(event) => onChange("timelineStartDate", event.target.value)}
              type="date"
              value={values.timelineStartDate}
            />
          </label>

          <label className="field">
            <span>Estimated Completion</span>
            <input
              disabled={disabled}
              onChange={(event) => onChange("timelineEndDate", event.target.value)}
              type="date"
              value={values.timelineEndDate}
            />
          </label>
        </div>

        <label className="field">
          <span>Timeline Notes</span>
          <textarea
            disabled={disabled}
            onChange={(event) => onChange("timelineNotes", event.target.value)}
            placeholder="Any specific review windows, timezone requirements, or urgency?"
            style={{ minHeight: 100 }}
            value={values.timelineNotes}
          />
        </label>
      </div>
    </section>

    {errorMessage ? (
      <div className="callout-warning" style={{ margin: 0 }}>
        <strong>Action Required</strong>
        <p>{errorMessage}</p>
      </div>
    ) : null}

    <div style={{ 
      display: "flex", alignItems: "center", justifyContent: "space-between", 
      padding: "20px 24px", background: "#F9FAFB", borderRadius: 12, border: "1px solid #E5E7EB"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button 
          className="button-primary" 
          disabled={disabled || isSubmitting} 
          type="submit"
          style={{ backgroundColor: companyAccent, paddingLeft: 32, paddingRight: 32 }}
        >
          {isSubmitting ? "Processing..." : submitLabel}
        </button>
        {footer}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
        Project draft will be securely stored for AI validation.
      </p>
    </div>
  </form>
);
