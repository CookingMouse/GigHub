"use client";

import React from "react";
import { useWizardState, wizardActions, type WorkType } from "../wizard-context";

type StepWorkLocationProps = {
  onBack: () => void;
  onNext: () => void;
};

const workTypeOptions: Array<{ value: WorkType; label: string; description: string }> = [
  { value: "remote", label: "Remote", description: "Work can be done from anywhere." },
  { value: "on_site", label: "On-site", description: "Work is expected at a specific location." },
  { value: "hybrid", label: "Hybrid", description: "Mix of remote and in-person work." }
];

export const StepWorkLocation = ({ onBack, onNext }: StepWorkLocationProps) => {
  const { state, dispatch } = useWizardState();

  return (
    <section className="inline-panel" style={{ padding: 24 }}>
      <p className="eyebrow">Step 5</p>
      <h2 style={{ marginTop: 0 }}>Work location</h2>
      <p className="muted">Choose how the role is delivered and add a location if needed.</p>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 20 }}>
        {workTypeOptions.map((option) => {
          const active = state.workType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => dispatch(wizardActions.setWorkType(option.value))}
              style={{
                textAlign: "left",
                borderRadius: 14,
                border: active ? "1px solid #1D4ED8" : "1px solid #E5E7EB",
                background: active ? "#EFF6FF" : "#FFFFFF",
                padding: 16,
                cursor: "pointer"
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>{option.label}</strong>
              <span style={{ fontSize: 13, color: "#6B7280" }}>{option.description}</span>
            </button>
          );
        })}
      </div>

      <label className="field" style={{ marginTop: 20 }}>
        <span>Location</span>
        <input
          disabled={state.workType === "remote"}
          placeholder="e.g. Kuala Lumpur, Malaysia"
          value={state.workLocation}
          onChange={(event) => dispatch(wizardActions.setWorkLocation(event.target.value))}
          type="text"
        />
      </label>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button className="button-secondary" type="button" onClick={onBack}>
          Back
        </button>
        <button className="button-primary" type="button" onClick={onNext}>
          Continue to skills
        </button>
      </div>
    </section>
  );
};
