"use client";

import React from "react";
import { taxonomy } from "@gighub/shared";
import useWizardState from "../wizard-context";
import TaxonomySelector from "../taxonomy-selector";

export default function StepDepartment() {
  const { state, dispatch } = useWizardState();

  const industryData = taxonomy.find(i => i.label === state.industry);
  const departments = industryData?.children || [];

  const handleSelect = (dept: string) => {
    dispatch({ type: "SET_DEPARTMENT", payload: dept });
    dispatch({ type: "NEXT_STEP" });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-ink tracking-tight">Select a Department</h2>
        <p className="text-muted mt-3 text-lg">Which department within {state.industry} does this role belong to?</p>
      </div>

      <TaxonomySelector
        options={departments.map(item => ({ id: item.id, label: item.label, sublabel: item.sublabel }))}
        selected={state.department}
        onSelect={handleSelect}
        allowCustom
        customPlaceholder="Type your department..."
      />

      <div className="mt-8 text-center">
        <button 
          onClick={() => dispatch({ type: "PREV_STEP" })}
          className="text-muted hover:text-ink font-semibold flex items-center justify-center mx-auto transition-colors"
        >
          <svg className="mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to industry
        </button>
      </div>
    </div>
  );
}
