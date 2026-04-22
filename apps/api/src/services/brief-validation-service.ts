import { jobValidationThreshold, type UpsertJobDraftInput } from "@gighub/shared";

export type BriefValidationResult = {
  score: number;
  summary: string;
  gaps: string[];
  clarifyingQuestions: string[];
};

export type BriefValidationProvider = {
  validate(input: UpsertJobDraftInput): BriefValidationResult;
};

const vaguePattern =
  /\b(tbd|etc|misc|asap|soon|later|something|whatever|flexible|to be decided)\b/i;

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const containsVagueLanguage = (value: string) => vaguePattern.test(value);

const collectText = (input: UpsertJobDraftInput) =>
  [
    input.title,
    input.brief.overview,
    ...input.brief.scope,
    ...input.brief.deliverables,
    ...input.brief.requirements,
    ...input.brief.acceptanceCriteria,
    input.brief.timeline.startDate,
    input.brief.timeline.endDate,
    input.brief.timeline.notes
  ]
    .filter(Boolean)
    .join(" ");

const summarize = (score: number, gaps: string[]) => {
  if (score >= jobValidationThreshold) {
    return gaps.length === 0
      ? "The brief is specific enough to publish."
      : "The brief can go live, but tightening the flagged areas will reduce dispute risk.";
  }

  return "The brief is not ready to publish. Tighten the flagged sections and validate again.";
};

export const deterministicBriefValidationProvider: BriefValidationProvider = {
  validate(input) {
    let score = 100;
    const gaps: string[] = [];
    const clarifyingQuestions: string[] = [];

    if (input.title.trim().length < 10) {
      score -= 12;
      gaps.push("Job title is too short to signal clear scope.");
      clarifyingQuestions.push("What exact outcome should the freelancer deliver?");
    }

    if (input.brief.overview.trim().length < 80) {
      score -= 18;
      gaps.push("Project overview needs more operational detail.");
      clarifyingQuestions.push("What business context and expected outcome should the freelancer know?");
    }

    if (input.brief.scope.length < 2) {
      score -= 16;
      gaps.push("Scope needs at least two concrete work items.");
      clarifyingQuestions.push("What are the main tasks included in the project scope?");
    }

    if (input.brief.deliverables.length < 2) {
      score -= 16;
      gaps.push("Deliverables list is not specific enough.");
      clarifyingQuestions.push("Which exact files, assets, or outputs must be submitted?");
    }

    if (input.brief.requirements.length < 1) {
      score -= 10;
      gaps.push("Requirements are missing.");
      clarifyingQuestions.push("Are there tools, formats, references, or constraints the freelancer must follow?");
    }

    if (input.brief.acceptanceCriteria.length < 1) {
      score -= 12;
      gaps.push("Acceptance criteria are missing.");
      clarifyingQuestions.push("How will you decide whether the submitted work passes?");
    }

    const hasTimelineWindow =
      input.brief.timeline.startDate.trim().length > 0 &&
      input.brief.timeline.endDate.trim().length > 0;
    const hasTimelineNotes = input.brief.timeline.notes.trim().length >= 20;

    if (!hasTimelineWindow && !hasTimelineNotes) {
      score -= 10;
      gaps.push("Timeline is missing a clear delivery window or timing notes.");
      clarifyingQuestions.push("When should the work start and when is final delivery due?");
    }

    if (input.milestoneCount > 1 && input.brief.deliverables.length < input.milestoneCount) {
      score -= 6;
      gaps.push("Milestone count is higher than the number of described deliverables.");
      clarifyingQuestions.push("How should the work be split across each milestone?");
    }

    if (containsVagueLanguage(collectText(input))) {
      score -= 8;
      gaps.push("The brief includes vague language that may trigger later disputes.");
      clarifyingQuestions.push("Which placeholder terms can be replaced with measurable requirements?");
    }

    const finalScore = clampScore(score);

    return {
      score: finalScore,
      summary: summarize(finalScore, gaps),
      gaps,
      clarifyingQuestions
    };
  }
};
