import { env } from "../lib/env";
import {
  deterministicBriefValidationProvider,
  type BriefValidationProvider
} from "./brief-validation-service";
import { liveBriefValidationProvider, liveGLMProvider } from "./live-glm-service";
import { mockGLMProvider } from "./mock-glm-service";

const isTestRuntime = env.NODE_ENV === "test" || process.env.VITEST === "true";
const useLiveGLM = !isTestRuntime && env.GLM_MODE === "live";

export const selectedBriefValidationProvider: BriefValidationProvider = useLiveGLM
  ? liveBriefValidationProvider
  : deterministicBriefValidationProvider;

export const selectedGLMProvider = useLiveGLM ? liveGLMProvider : mockGLMProvider;

export const glmProviderMode = useLiveGLM ? "live" : "mock";
