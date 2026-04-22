import { upsertJobDraftSchema, type JobRecord, type UpsertJobDraftInput } from "@gighub/shared";

export type JobFormValues = {
  title: string;
  budget: string;
  milestoneCount: string;
  overview: string;
  scopeText: string;
  deliverablesText: string;
  requirementsText: string;
  acceptanceCriteriaText: string;
  timelineStartDate: string;
  timelineEndDate: string;
  timelineNotes: string;
};

const joinLines = (items: string[]) => items.join("\n");

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

export const emptyJobFormValues: JobFormValues = {
  title: "",
  budget: "",
  milestoneCount: "1",
  overview: "",
  scopeText: "",
  deliverablesText: "",
  requirementsText: "",
  acceptanceCriteriaText: "",
  timelineStartDate: "",
  timelineEndDate: "",
  timelineNotes: ""
};

export const jobRecordToFormValues = (job: JobRecord): JobFormValues => ({
  title: job.title,
  budget: String(job.budget),
  milestoneCount: String(job.milestoneCount),
  overview: job.brief.overview,
  scopeText: joinLines(job.brief.scope),
  deliverablesText: joinLines(job.brief.deliverables),
  requirementsText: joinLines(job.brief.requirements),
  acceptanceCriteriaText: joinLines(job.brief.acceptanceCriteria),
  timelineStartDate: job.brief.timeline.startDate,
  timelineEndDate: job.brief.timeline.endDate,
  timelineNotes: job.brief.timeline.notes
});

export const serializeJobFormValues = (value: JobFormValues) => JSON.stringify(value);

export const jobFormValuesToInput = (value: JobFormValues): UpsertJobDraftInput =>
  upsertJobDraftSchema.parse({
    title: value.title,
    budget: value.budget,
    milestoneCount: value.milestoneCount,
    brief: {
      overview: value.overview,
      scope: splitLines(value.scopeText),
      deliverables: splitLines(value.deliverablesText),
      requirements: splitLines(value.requirementsText),
      acceptanceCriteria: splitLines(value.acceptanceCriteriaText),
      timeline: {
        startDate: value.timelineStartDate,
        endDate: value.timelineEndDate,
        notes: value.timelineNotes
      }
    }
  });
