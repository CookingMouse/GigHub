"use client";

import React from "react";
import type { MilestoneFormValue } from "@/lib/milestone-plan";

type MilestonePlanFormProps = {
  milestones: MilestoneFormValue[];
  onChange: (index: number, field: keyof MilestoneFormValue, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onApplyHalfSplit?: () => void;
  totalBudget: number;
  disabled?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  helperText?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const MilestonePlanForm = ({
  milestones,
  onChange,
  onSubmit,
  onApplyHalfSplit,
  totalBudget,
  disabled = false,
  isSubmitting = false,
  errorMessage,
  helperText
}: MilestonePlanFormProps) => {
  const currentTotal = milestones.reduce((sum, milestone) => {
    const parsedAmount = Number(milestone.amount);
    return sum + (Number.isFinite(parsedAmount) ? parsedAmount : 0);
  }, 0);

  return (
    <form className="job-form" onSubmit={onSubmit}>
      <div className="panel-heading-row">
        <div>
          <p className="eyebrow">Milestone plan</p>
          <h2>{milestones.length} milestone(s)</h2>
        </div>

        {onApplyHalfSplit ? (
          <button
            className="button-secondary"
            disabled={disabled || isSubmitting}
            onClick={onApplyHalfSplit}
            type="button"
          >
            Apply 50/50 split
          </button>
        ) : null}
      </div>

      <div className="status-grid compact-grid">
        <article className="status-panel">
          <span className="panel-label">Budget</span>
          <strong>{formatCurrency(totalBudget)}</strong>
          <p>Milestones must match the funded budget exactly.</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Current total</span>
          <strong>{formatCurrency(currentTotal)}</strong>
          <p>Adjust each amount until the plan balances.</p>
        </article>
      </div>

      <div className="card-stack">
        {milestones.map((milestone, index) => (
          <section className="inline-panel" key={index}>
            <div className="job-form-grid">
              <label className="field">
                <span>Sequence</span>
                <input
                  disabled={disabled}
                  onChange={(event) => onChange(index, "sequence", event.target.value)}
                  type="number"
                  value={milestone.sequence}
                />
              </label>

              <label className="field">
                <span>Amount (MYR)</span>
                <input
                  disabled={disabled}
                  onChange={(event) => onChange(index, "amount", event.target.value)}
                  step="0.01"
                  type="number"
                  value={milestone.amount}
                />
              </label>

              <label className="field">
                <span>Due date</span>
                <input
                  disabled={disabled}
                  onChange={(event) => onChange(index, "dueAt", event.target.value)}
                  type="date"
                  value={milestone.dueAt}
                />
              </label>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                disabled={disabled}
                onChange={(event) => onChange(index, "title", event.target.value)}
                type="text"
                value={milestone.title}
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                disabled={disabled}
                onChange={(event) => onChange(index, "description", event.target.value)}
                rows={4}
                value={milestone.description}
              />
            </label>
          </section>
        ))}
      </div>

      {helperText ? <p className="muted">{helperText}</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="job-form-actions">
        <button className="button-primary" disabled={disabled || isSubmitting} type="submit">
          {isSubmitting ? "Saving milestones..." : "Save milestones"}
        </button>
      </div>
    </form>
  );
};
