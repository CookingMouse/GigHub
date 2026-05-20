"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";

export type WizardState = {
  currentStep: number;
  industry: string | null;
  department: string | null;
  jobTitle: string | null;
  details: string;
  location: string;
  skills: string[];
};

type WizardAction =
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_INDUSTRY"; payload: string }
  | { type: "SET_DEPARTMENT"; payload: string }
  | { type: "SET_JOB_TITLE"; payload: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" };

const initialState: WizardState = {
  currentStep: 1,
  industry: null,
  department: null,
  jobTitle: null,
  details: "",
  location: "",
  skills: [],
};

const WizardContext = createContext<{
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
} | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer((state: WizardState, action: WizardAction): WizardState => {
    switch (action.type) {
      case "SET_STEP":
        return { ...state, currentStep: action.payload };
      case "SET_INDUSTRY":
        return { ...state, industry: action.payload };
      case "SET_DEPARTMENT":
        return { ...state, department: action.payload };
      case "SET_JOB_TITLE":
        return { ...state, jobTitle: action.payload };
      case "NEXT_STEP":
        return { ...state, currentStep: Math.min(state.currentStep + 1, 6) };
      case "PREV_STEP":
        return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
      default:
        return state;
    }
  }, initialState);

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

export default function useWizardState() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizardState must be used within a WizardProvider");
  }
  return context;
}
