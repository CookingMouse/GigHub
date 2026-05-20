"use client";

import React from "react";
import { taxonomy } from "@gighub/shared";
import useWizardState from "../wizard-context";
import TaxonomySelector from "../taxonomy-selector";

export default function StepIndustry() {
  const { state, dispatch } = useWizardState();

  const handleSelect = (industry: string) => {
    dispatch({ type: "SET_INDUSTRY", payload: industry });
    dispatch({ type: "NEXT_STEP" });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-ink tracking-tight">What's your industry?</h2>
        <p className="text-muted mt-3 text-lg">Choose the industry that best fits your job posting</p>
      </div>

      <TaxonomySelector
        options={taxonomy.map(item => ({ id: item.id, label: item.label, sublabel: item.sublabel }))}
        selected={state.industry}
        onSelect={handleSelect}
        allowCustom
        customPlaceholder="Type your industry..."
      />
    </div>
  );
}
