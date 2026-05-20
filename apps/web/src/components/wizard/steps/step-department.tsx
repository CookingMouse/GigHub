"use client";

import React from "react";
import { useWizardState, wizardActions, wizardTaxonomy } from "../wizard-context";

export const StepDepartment = () => {
  const { state, dispatch } = useWizardState();
  const selectedIndustry = wizardTaxonomy.industries.find((industry) => industry.label === state.industry) ?? null;
  const departments = selectedIndustry?.departments ?? [];

  return (
    <section className="inline-panel" style={{ padding: 24 }}>
      <p className="eyebrow">Step 2</p>
      <h2 style={{ marginTop: 0 }}>Choose a department</h2>
      <p className="muted">
        {selectedIndustry ? `Departments within ${selectedIndustry.label}.` : "Choose an industry first."}
      </p>

      {departments.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
          {departments.map((department) => {
            const active = state.department === department.label;

            return (
              <button
                key={department.id}
                type="button"
                onClick={() => {
                  dispatch(wizardActions.setDepartment(department.label));
                  dispatch(wizardActions.nextStep());
                }}
                style={{
                  textAlign: "left",
                  borderRadius: 16,
                  border: active ? "1px solid #1D4ED8" : "1px solid #E5E7EB",
                  background: active ? "#EFF6FF" : "#FFFFFF",
                  padding: 16,
                  cursor: "pointer"
                }}
              >
                <strong style={{ display: "block", marginBottom: 6 }}>{department.label}</strong>
                <span style={{ display: "block", fontSize: 13, color: "#6B7280" }}>
                  {department.jobTitles.length} job titles
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="callout-warning" style={{ marginTop: 20 }}>
          <strong>Select an industry first</strong>
          <p>Use step 1 to unlock department choices.</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button className="button-secondary" type="button" onClick={() => dispatch(wizardActions.prevStep())}>
          Back
        </button>
        <span style={{ fontSize: 13, color: "#6B7280", alignSelf: "center" }}>Pick a department to continue</span>
      </div>
    </section>
  );
};
