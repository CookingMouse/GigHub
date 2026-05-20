"use client";

import React from "react";
import { useWizardState, wizardActions, wizardTaxonomy } from "../wizard-context";

export const StepIndustry = () => {
  const { state, dispatch } = useWizardState();

  return (
    <section className="inline-panel" style={{ padding: 24 }}>
      <p className="eyebrow">Step 1</p>
      <h2 style={{ marginTop: 0 }}>Choose an industry</h2>
      <p className="muted">Industry selection will drive the rest of the wizard flow.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
        {wizardTaxonomy.industries.map((industry) => {
          const active = state.industry === industry.label;

          return (
            <button
              key={industry.id}
              type="button"
              onClick={() => {
                dispatch(
                  wizardActions.setIndustry(
                    industry.label,
                    `We are hiring for a ${industry.label.toLowerCase()} project and need a freelancer who can deliver clear outcomes.`
                  )
                );
                dispatch(wizardActions.nextStep());
              }}
              style={{
                textAlign: "left",
                borderRadius: 16,
                border: active ? "1px solid #1D4ED8" : "1px solid #E5E7EB",
                background: active ? "#EFF6FF" : "#FFFFFF",
                padding: 16,
                cursor: "pointer",
                boxShadow: active ? "0 0 0 3px rgba(29, 78, 216, 0.08)" : "none"
              }}
            >
              <strong style={{ display: "block", marginBottom: 6 }}>{industry.label}</strong>
              <span style={{ display: "block", fontSize: 13, color: "#6B7280" }}>
                {industry.departments.length} departments
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button className="button-secondary" type="button" disabled>
          Back
        </button>
        <span style={{ fontSize: 13, color: "#6B7280", alignSelf: "center" }}>Pick an industry to continue</span>
      </div>
    </section>
  );
};
