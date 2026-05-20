"use client";

import React from "react";
import useWizardState from "./wizard-context";

const STEPS = [
  "Industry",
  "Department",
  "Job Title",
  "Job Details",
  "Work Location",
  "Skills",
];

export default function WizardStepper() {
  const { state } = useWizardState();
  const { currentStep } = state;

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between relative max-w-4xl mx-auto px-4">
        {/* Background line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-border -translate-y-1/2 z-0" />
        
        {/* Progress line */}
        <div 
          className="absolute top-1/2 left-4 h-0.5 bg-accent -translate-y-1/2 z-0 transition-all duration-500 ease-in-out" 
          style={{ width: `calc(${(Math.max(0, currentStep - 1) / (STEPS.length - 1)) * 100}% - 32px)` }}
        />

        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              <div 
                className={`
                  flex items-center justify-center rounded-full border-2 transition-all duration-300
                  ${isActive ? "w-10 h-10 border-accent bg-accent text-white scale-110 shadow-lg" : ""}
                  ${isCompleted ? "w-8 h-8 border-accent bg-accent text-white" : ""}
                  ${isUpcoming ? "w-8 h-8 border-border bg-panel text-muted" : ""}
                `}
              >
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">{stepNumber}</span>
                )}
              </div>
              <span 
                className={`
                  absolute top-12 whitespace-nowrap text-[10px] md:text-xs font-bold uppercase tracking-wider
                  ${isActive ? "text-accent" : "text-muted"}
                `}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
