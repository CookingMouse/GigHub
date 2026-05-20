"use client";

import React from "react";
import { useWizardState, wizardActions, wizardTaxonomy } from "../wizard-context";

export const StepJobTitle = () => {
  const { state, dispatch } = useWizardState();
  const selectedIndustry = wizardTaxonomy.industries.find((industry) => industry.label === state.industry) ?? null;
  const selectedDepartment =
    selectedIndustry?.departments.find((department) => department.label === state.department) ?? null;
  const jobTitles = selectedDepartment?.jobTitles ?? [];

  return (
    <section className="inline-panel" style={{ padding: 24 }}>
      <p className="eyebrow">Step 3</p>
      <h2 style={{ marginTop: 0 }}>Pick a job title</h2>
      <p className="muted">
        {selectedDepartment
          ? `Titles available for ${selectedDepartment.label}.`
          : "Choose an industry and department first."}
      </p>

      {jobTitles.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
          {jobTitles.map((jobTitle) => {
            const active = state.jobTitleTag === jobTitle;

            return (
              <button
                key={jobTitle}
                type="button"
                onClick={() => {
                  dispatch(wizardActions.setJobTitle(jobTitle));
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
                <strong style={{ display: "block", marginBottom: 6 }}>{jobTitle}</strong>
                <span style={{ display: "block", fontSize: 13, color: "#6B7280" }}>
                  Will prefill the job title field
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="callout-warning" style={{ marginTop: 20 }}>
          <strong>Select a department first</strong>
          <p>Use step 2 to unlock title choices.</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button className="button-secondary" type="button" onClick={() => dispatch(wizardActions.prevStep())}>
          Back
        </button>
        <span style={{ fontSize: 13, color: "#6B7280", alignSelf: "center" }}>Pick a title to continue</span>
      </div>
    </section>
  );
};
