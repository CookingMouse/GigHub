import type { UpsertJobDraftInput } from "@gighub/shared";
import { env } from "../lib/env";
import type { BriefValidationProvider, BriefValidationResult } from "./brief-validation-service";
import type {
  DisputeAnalysisInput,
  DisputeAnalysisResult,
  IncomeNarrativeInput,
  IncomeNarrativeResult,
  MilestoneScoringInput,
  MilestoneScoringResult,
  ResumeParsingResult
} from "./mock-glm-service";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type LiveGLMResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const extractJsonObject = (content: string) => {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("GLM response did not include a JSON object.");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
};

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asPassFail = (value: unknown): "pass" | "partial" | "fail" => {
  if (value === "pass" || value === "partial" || value === "fail") {
    return value;
  }

  return "fail";
};

const asRecommendation = (value: unknown): "release_funds" | "request_revision" =>
  value === "request_revision" ? "request_revision" : "release_funds";

const parseRequirementScores = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;
    const requirement = asString(record.requirement);
    const score = asNumber(record.score, NaN);

    if (!requirement || !Number.isFinite(score)) {
      return [];
    }

    return [
      {
        requirement,
        score: clampScore(score)
      }
    ];
  });
};

const callGLMJson = async (messages: ChatMessage[]) => {
  if (!env.GLM_API_KEY) {
    throw new Error("GLM_API_KEY is missing.");
  }

  const response = await fetch(`${env.GLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GLM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.GLM_MODEL,
      messages,
      temperature: 0.1,
      response_format: {
        type: "json_object"
      }
    })
  });

  const payload = (await response.json().catch(() => null)) as LiveGLMResponse | { error?: unknown } | null;

  if (!response.ok) {
    console.error("GLM error body:", JSON.stringify(payload));
    throw new Error(`GLM request failed with ${response.status}.`);
  }

  const content =
    payload && "choices" in payload ? payload.choices?.[0]?.message?.content : undefined;

  if (!content) {
    throw new Error("GLM response did not include message content.");
  }

  return extractJsonObject(content);
};

const systemPrompt =
  "You are GigHub's decision intelligence layer. Return only valid JSON matching the requested schema. Do not include markdown or prose outside JSON.";

export const liveBriefValidationProvider: BriefValidationProvider = {
  async validate(input: UpsertJobDraftInput): Promise<BriefValidationResult> {
    const output = await callGLMJson([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "brief_validation",
          schema: {
            score: "number 0-100",
            summary: "string",
            gaps: "string[]",
            clarifyingQuestions: "string[]"
          },
          brief: input
        })
      }
    ]);

    return {
      score: clampScore(asNumber(output.score)),
      summary: asString(output.summary, "GLM evaluated the brief."),
      gaps: asStringArray(output.gaps),
      clarifyingQuestions: asStringArray(output.clarifyingQuestions)
    };
  }
};

export const liveGLMProvider = {
  async scoreMilestone(input: MilestoneScoringInput): Promise<MilestoneScoringResult> {
    const output = await callGLMJson([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "milestone_scoring",
          instruction:
            "Assess whether metadata-only submission evidence satisfies the brief. Do not infer file contents beyond metadata.",
          schema: {
            overallScore: "number 0-100",
            requirementScores: [{ requirement: "string", score: "number 0-100" }],
            passFail: "pass | partial | fail",
            reasoning: "string"
          },
          input
        })
      }
    ]);

    return {
      overallScore: clampScore(asNumber(output.overallScore)),
      requirementScores: parseRequirementScores(output.requirementScores),
      passFail: asPassFail(output.passFail),
      reasoning: asString(output.reasoning, "GLM scored the milestone submission.")
    };
  },

  async analyzeDispute(input: DisputeAnalysisInput): Promise<DisputeAnalysisResult> {
    const output = await callGLMJson([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "dispute_analysis",
          instruction:
            "Compare milestone scoring context and rejection reason. Flag vague or repeat bad-faith rejection patterns.",
          schema: {
            recommendation: "release_funds | request_revision",
            badFaithFlags: "string[]",
            reasoning: "string"
          },
          input
        })
      }
    ]);

    return {
      recommendation: asRecommendation(output.recommendation),
      badFaithFlags: asStringArray(output.badFaithFlags),
      reasoning: asString(output.reasoning, "GLM analyzed the dispute.")
    };
  },

  async generateIncomeNarrative(input: IncomeNarrativeInput): Promise<IncomeNarrativeResult> {
    const output = await callGLMJson([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "income_intelligence",
          instruction:
            "Write a concise formal income summary paragraph based only on released escrow records.",
          schema: {
            narrative: "string"
          },
          input
        })
      }
    ]);

    return {
      narrative: asString(output.narrative, "GLM generated an income summary from released escrow records.")
    };
  },

  async parseResume(text: string): Promise<ResumeParsingResult> {
    const output = await callGLMJson([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "resume_parsing",
          instruction:
            "Extract freelancer profile information from the provided resume text. Be concise and professional.",
          schema: {
            skills: "string[]",
            experienceYears: "number",
            headline: "string (max 160 chars)",
            bio: "string (max 1000 chars, professional summary)"
          },
          resumeText: text.slice(0, 10000) // Limit text to avoid token limits
        })
      }
    ]);

    return {
      skills: asStringArray(output.skills),
      experienceYears: asNumber(output.experienceYears, 0),
      headline: asString(output.headline, "Freelancer Profile").slice(0, 160),
      bio: asString(output.bio, "Professional freelancer summary.").slice(0, 1000)
    };
  }
};
