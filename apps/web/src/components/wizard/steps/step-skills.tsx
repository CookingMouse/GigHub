"use client";

import React, { useState } from "react";
import { skillTags } from "@/lib/wizard-taxonomy";
import { useWizardState, wizardActions } from "../wizard-context";

type StepSkillsProps = {
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
};

export const StepSkills = ({ onBack, onSubmit, isSubmitting = false }: StepSkillsProps) => {
  const { state, dispatch } = useWizardState();
  const [customSkill, setCustomSkill] = useState("");

  const toggleSkill = (skill: string) => {
    const next = state.skills.includes(skill)
      ? state.skills.filter((entry) => entry !== skill)
      : [...state.skills, skill];

    dispatch(wizardActions.setSkills(next));
  };

  const addCustomSkill = () => {
    const value = customSkill.trim();

    if (!value) {
      return;
    }

    const next = state.toolStack.includes(value) ? state.toolStack : [...state.toolStack, value];
    dispatch(wizardActions.setToolStack(next));
    setCustomSkill("");
  };

  return (
    <section className="inline-panel" style={{ padding: 24 }}>
      <p className="eyebrow">Step 6</p>
      <h2 style={{ marginTop: 0 }}>Skills and tools</h2>
      <p className="muted">Select matching skills and add any custom tools or stack notes.</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
        {skillTags.map((skill) => {
          const active = state.skills.includes(skill);

          return (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              style={{
                borderRadius: 999,
                border: active ? "1px solid #1D4ED8" : "1px solid #D1D5DB",
                background: active ? "#DBEAFE" : "#FFFFFF",
                color: "#111827",
                padding: "8px 12px",
                cursor: "pointer"
              }}
            >
              {skill}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <label className="field">
          <span>Custom tool or stack entry</span>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              value={customSkill}
              onChange={(event) => setCustomSkill(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="e.g. Webflow, Zapier, Notion"
              type="text"
            />
            <button className="button-secondary" type="button" onClick={addCustomSkill}>
              Add
            </button>
          </div>
        </label>
      </div>

      {state.toolStack.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6B7280" }}>Custom entries</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {state.toolStack.map((item) => (
              <span
                key={item}
                style={{
                  background: "#F3F4F6",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 13
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
        <button className="button-secondary" type="button" onClick={onBack}>
          Back
        </button>
        <button className="button-primary" type="button" disabled={isSubmitting} onClick={onSubmit}>
          {isSubmitting ? "Creating..." : "Create job draft"}
        </button>
      </div>
    </section>
  );
};
