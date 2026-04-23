import type { SupportedSubmissionFormat } from "@gighub/shared";

export type MilestoneScoringInput = {
  briefOverview: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  fileFormat: SupportedSubmissionFormat;
  fileSizeBytes: number;
  fileHash: string;
  wordCount: number | null;
  dimensions: string | null;
  revision: number;
  notes: string | null;
  fileName: string;
};

export type RequirementScore = {
  requirement: string;
  score: number;
};

export type MilestoneScoringResult = {
  overallScore: number;
  requirementScores: RequirementScore[];
  passFail: "pass" | "partial" | "fail";
  reasoning: string;
};

export type DisputeAnalysisInput = {
  rejectionReason: string;
  milestoneScore: number | null;
  milestonePassFail: string | null;
  clientDisputeHistoryCount: number;
};

export type IncomeNarrativeInput = {
  totalEarned: number;
  totalJobs: number;
  totalMilestones: number;
  avgMonthlyIncome: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  topCategories: string[];
};

export type DisputeAnalysisResult = {
  recommendation: "release_funds" | "request_revision";
  badFaithFlags: string[];
  reasoning: string;
};

export type IncomeNarrativeResult = {
  narrative: string;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const readForceOutcome = (fileName: string, notes: string | null) => {
  const target = `${fileName} ${notes ?? ""}`.toLowerCase();

  if (target.includes("__force_fail")) {
    return "fail" as const;
  }

  if (target.includes("__force_partial")) {
    return "partial" as const;
  }

  if (target.includes("__force_pass")) {
    return "pass" as const;
  }

  return null;
};

const summarizeScoring = (passFail: "pass" | "partial" | "fail", overallScore: number) => {
  if (passFail === "pass") {
    return `Mock GLM found the submission credible against the milestone brief, with enough structured evidence to release review to the company at ${overallScore}/100.`;
  }

  if (passFail === "partial") {
    return `Mock GLM found partial evidence of milestone completion at ${overallScore}/100, but the submission does not yet provide enough confidence for release review.`;
  }

  return `Mock GLM found weak evidence of milestone completion at ${overallScore}/100, so the submission has been routed back for revision before company review.`;
};

const buildRequirementScores = (input: MilestoneScoringInput): RequirementScore[] => {
  const formatEvidenceScore =
    input.fileFormat === "zip"
      ? 55
      : input.wordCount !== null
        ? Math.min(100, Math.max(45, input.wordCount * 4))
        : input.dimensions
          ? 88
          : 35;

  const briefCoverageScore = clampScore(
    35 +
      input.deliverables.length * 12 +
      input.acceptanceCriteria.length * 10 +
      (input.briefOverview.trim().length > 120 ? 10 : 0)
  );

  const deliveryTraceScore = clampScore(
    35 +
      Math.min(input.fileSizeBytes / 80, 30) +
      (input.fileHash ? 15 : 0) -
      Math.max((input.revision - 1) * 8, 0)
  );

  return [
    {
      requirement: "deliverable_evidence",
      score: formatEvidenceScore
    },
    {
      requirement: "brief_coverage",
      score: briefCoverageScore
    },
    {
      requirement: "delivery_trace",
      score: deliveryTraceScore
    }
  ];
};

export const mockGLMProvider = {
  scoreMilestone(input: MilestoneScoringInput): MilestoneScoringResult {
    const forcedOutcome = readForceOutcome(input.fileName, input.notes);
    const requirementScores = buildRequirementScores(input);
    let overallScore = clampScore(
      requirementScores.reduce((sum, requirement) => sum + requirement.score, 0) /
        requirementScores.length
    );

    let passFail: "pass" | "partial" | "fail";

    if (forcedOutcome) {
      passFail = forcedOutcome;
      overallScore =
        forcedOutcome === "pass" ? Math.max(overallScore, 82) : forcedOutcome === "partial" ? 58 : 32;
    } else if (overallScore >= 70) {
      passFail = "pass";
    } else if (overallScore >= 45) {
      passFail = "partial";
    } else {
      passFail = "fail";
    }

    return {
      overallScore,
      requirementScores,
      passFail,
      reasoning: summarizeScoring(passFail, overallScore)
    };
  },

  analyzeDispute(input: DisputeAnalysisInput): DisputeAnalysisResult {
    const badFaithFlags: string[] = [];
    const normalizedReason = input.rejectionReason.trim().toLowerCase();
    const vagueReason =
      normalizedReason.length < 24 ||
      ["not good", "bad", "redo this", "not enough", "not okay"].some((term) =>
        normalizedReason.includes(term)
      );

    if (vagueReason) {
      badFaithFlags.push("vague_rejection_reason");
    }

    if (input.clientDisputeHistoryCount >= 2) {
      badFaithFlags.push("repeat_dispute_pattern");
    }

    const likelyRevisionRequest =
      normalizedReason.includes("missing") ||
      normalizedReason.includes("wrong") ||
      normalizedReason.includes("incomplete") ||
      normalizedReason.includes("not aligned");

    if (likelyRevisionRequest && badFaithFlags.length === 0) {
      return {
        recommendation: "request_revision",
        badFaithFlags,
        reasoning:
          "Mock GLM found the client rejection reason specific enough to support another revision cycle before release."
      };
    }

    return {
      recommendation: "release_funds",
      badFaithFlags,
      reasoning:
        badFaithFlags.length > 0
          ? "Mock GLM found bad-faith indicators around the rejection and recommends releasing funds pending moderator review."
          : "Mock GLM found the available milestone evidence stronger than the rejection rationale and recommends release pending moderator review."
    };
  },

  generateIncomeNarrative(input: IncomeNarrativeInput): IncomeNarrativeResult {
    const formatter = new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: input.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const period = `${input.periodStart.toISOString().slice(0, 10)} to ${input.periodEnd
      .toISOString()
      .slice(0, 10)}`;
    const categories =
      input.topCategories.length > 0
        ? ` Key earning categories include ${input.topCategories.join(", ")}.`
        : "";

    return {
      narrative: `For the period ${period}, this freelancer earned ${formatter.format(
        input.totalEarned
      )} across ${input.totalMilestones} released milestone(s) from ${
        input.totalJobs
      } completed job(s). Estimated average monthly income is ${formatter.format(
        input.avgMonthlyIncome
      )}.${categories} This statement is generated from released escrow records and is suitable for income review workflows.`
    };
  }
};
