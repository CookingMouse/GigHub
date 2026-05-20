"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode
} from "react";
import type { UpsertJobDraftInput } from "@gighub/shared";
import { emptyJobFormValues, jobFormValuesToInput, type JobFormValues } from "@/lib/job-form";
import { taxonomy } from "../../../../../packages/shared/src/taxonomy";

export type WorkType = "remote" | "on_site" | "hybrid" | null;

export type WizardState = {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  industry: string | null;
  department: string | null;
  jobTitleTag: string | null;
  formValues: JobFormValues;
  workType: WorkType;
  workLocation: string;
  skills: string[];
  toolStack: string[];
};

type WizardAction =
  | { type: "SET_INDUSTRY"; industry: string | null; overviewTemplate?: string }
  | { type: "SET_DEPARTMENT"; department: string | null }
  | { type: "SET_JOB_TITLE"; jobTitleTag: string | null }
  | { type: "SET_FORM_FIELD"; field: keyof JobFormValues; value: string }
  | { type: "SET_WORK_TYPE"; workType: WorkType }
  | { type: "SET_WORK_LOCATION"; workLocation: string }
  | { type: "SET_SKILLS"; skills: string[] }
  | { type: "SET_TOOL_STACK"; toolStack: string[] }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" };

const initialState: WizardState = {
  currentStep: 1,
  industry: null,
  department: null,
  jobTitleTag: null,
  formValues: emptyJobFormValues,
  workType: null,
  workLocation: "",
  skills: [],
  toolStack: []
};

const setStep = (currentStep: WizardState["currentStep"], delta: number): WizardState["currentStep"] => {
  const next = Math.min(6, Math.max(1, currentStep + delta));
  return next as WizardState["currentStep"];
};

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case "SET_INDUSTRY": {
      const nextOverview =
        state.formValues.overview.trim().length === 0 && action.overviewTemplate
          ? action.overviewTemplate
          : state.formValues.overview;

      return {
        ...state,
        industry: action.industry,
        department: null,
        jobTitleTag: null,
        formValues: {
          ...state.formValues,
          overview: nextOverview
        }
      };
    }
    case "SET_DEPARTMENT":
      return {
        ...state,
        department: action.department,
        jobTitleTag: null
      };
    case "SET_JOB_TITLE":
      return {
        ...state,
        jobTitleTag: action.jobTitleTag,
        formValues: {
          ...state.formValues,
          title:
            state.formValues.title.trim().length === 0 && action.jobTitleTag
              ? action.jobTitleTag
              : state.formValues.title
        }
      };
    case "SET_FORM_FIELD":
      return {
        ...state,
        formValues: {
          ...state.formValues,
          [action.field]: action.value
        }
      };
    case "SET_WORK_TYPE":
      return {
        ...state,
        workType: action.workType
      };
    case "SET_WORK_LOCATION":
      return {
        ...state,
        workLocation: action.workLocation
      };
    case "SET_SKILLS":
      return {
        ...state,
        skills: action.skills
      };
    case "SET_TOOL_STACK":
      return {
        ...state,
        toolStack: action.toolStack
      };
    case "NEXT_STEP":
      return {
        ...state,
        currentStep: setStep(state.currentStep, 1)
      };
    case "PREV_STEP":
      return {
        ...state,
        currentStep: setStep(state.currentStep, -1)
      };
    default:
      return state;
  }
};

type WizardContextValue = {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};

export const useWizardState = () => {
  const context = useContext(WizardContext);

  if (!context) {
    throw new Error("useWizardState must be used within a WizardProvider.");
  }

  return context;
};

export type WizardDerivedFormInput = UpsertJobDraftInput & {
  industry: string | null;
  department: string | null;
  jobTitleTag: string | null;
  workType: WorkType;
  workLocation: string;
  skills: string[];
  toolStack: string[];
};

export const useWizardDerivedFormInput = (): (() => WizardDerivedFormInput) => {
  const { state } = useWizardState();

  return () => {
    const baseInput = jobFormValuesToInput(state.formValues);

    return {
      ...baseInput,
      industry: state.industry,
      department: state.department,
      jobTitleTag: state.jobTitleTag,
      workType: state.workType,
      workLocation: state.workLocation,
      skills: state.skills,
      toolStack: state.toolStack
    };
  };
};

export const wizardActions = {
  setIndustry: (industry: string | null, overviewTemplate?: string): WizardAction => ({
    type: "SET_INDUSTRY",
    industry,
    overviewTemplate
  }),
  setDepartment: (department: string | null): WizardAction => ({
    type: "SET_DEPARTMENT",
    department
  }),
  setJobTitle: (jobTitleTag: string | null): WizardAction => ({
    type: "SET_JOB_TITLE",
    jobTitleTag
  }),
  setFormField: (field: keyof JobFormValues, value: string): WizardAction => ({
    type: "SET_FORM_FIELD",
    field,
    value
  }),
  setWorkType: (workType: WorkType): WizardAction => ({
    type: "SET_WORK_TYPE",
    workType
  }),
  setWorkLocation: (workLocation: string): WizardAction => ({
    type: "SET_WORK_LOCATION",
    workLocation
  }),
  setSkills: (skills: string[]): WizardAction => ({
    type: "SET_SKILLS",
    skills
  }),
  setToolStack: (toolStack: string[]): WizardAction => ({
    type: "SET_TOOL_STACK",
    toolStack
  }),
  nextStep: (): WizardAction => ({ type: "NEXT_STEP" }),
  prevStep: (): WizardAction => ({ type: "PREV_STEP" })
} as const;

export const wizardTaxonomy = taxonomy;
