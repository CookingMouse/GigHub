import { z } from "zod";

export const appRoles = ["freelancer", "company", "admin"] as const;
export const registrationRoles = ["freelancer", "company"] as const;
export const jobStatuses = [
  "DRAFT",
  "OPEN",
  "ASSIGNED",
  "ESCROW_FUNDED",
  "IN_PROGRESS",
  "COMPLETED",
  "DISPUTED",
  "CANCELLED"
] as const;
export const escrowStatuses = [
  "UNFUNDED",
  "FUNDED",
  "PARTIALLY_RELEASED",
  "FULLY_RELEASED",
  "REFUNDED",
  "HELD"
] as const;
export const milestoneStatuses = [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "RELEASED",
  "DISPUTED",
  "REVISION_REQUESTED"
] as const;
export const submissionStatuses = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "DISPUTED"
] as const;
export const supportedSubmissionFormats = ["pdf", "docx", "png", "jpg", "zip"] as const;
export const submissionRevisionLimit = 3;
export const jobValidationThreshold = 70;

export type AppRole = (typeof appRoles)[number];
export type RegistrationRole = (typeof registrationRoles)[number];
export type JobStatus = (typeof jobStatuses)[number];
export type EscrowStatus = (typeof escrowStatuses)[number];
export type MilestoneStatus = (typeof milestoneStatuses)[number];
export type SubmissionStatus = (typeof submissionStatuses)[number];
export type SupportedSubmissionFormat = (typeof supportedSubmissionFormats)[number];

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(registrationRoles)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72)
});

const checklistItemSchema = z.string().trim().min(1).max(240);

export const jobTimelineSchema = z.object({
  startDate: z.string().trim().max(50).optional().default(""),
  endDate: z.string().trim().max(50).optional().default(""),
  notes: z.string().trim().max(1000).optional().default("")
});

export const jobBriefSchema = z.object({
  overview: z.string().trim().max(5000).optional().default(""),
  scope: z.array(checklistItemSchema).max(20).optional().default([]),
  deliverables: z.array(checklistItemSchema).max(20).optional().default([]),
  requirements: z.array(checklistItemSchema).max(20).optional().default([]),
  acceptanceCriteria: z.array(checklistItemSchema).max(20).optional().default([]),
  timeline: jobTimelineSchema.optional().default({
    startDate: "",
    endDate: "",
    notes: ""
  })
});

export const upsertJobDraftSchema = z.object({
  title: z.string().trim().min(5).max(160),
  budget: z.coerce.number().positive().max(10_000_000),
  milestoneCount: z.coerce.number().int().min(1).max(5),
  brief: jobBriefSchema
});

export const assignFreelancerSchema = z.object({
  freelancerId: z.string().trim().min(1).max(191)
});

export const milestonePlanItemSchema = z.object({
  sequence: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  amount: z.coerce.number().positive().max(10_000_000),
  dueAt: z.string().trim().max(50).optional().default("")
});

export const milestonePlanSchema = z
  .object({
    milestones: z.array(milestonePlanItemSchema).min(1).max(5)
  })
  .superRefine((value, context) => {
    const seenSequences = new Set<number>();

    value.milestones.forEach((milestone, index) => {
      if (seenSequences.has(milestone.sequence)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Milestone sequence numbers must be unique.",
          path: ["milestones", index, "sequence"]
        });
        return;
      }

      seenSequences.add(milestone.sequence);
    });
  });

export const mockPaymentWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(191),
  intentId: z.string().trim().min(1).max(191),
  type: z.literal("payment.succeeded")
});

export const submissionNotesSchema = z.object({
  notes: z.string().trim().max(2000).optional().default("")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JobTimeline = z.infer<typeof jobTimelineSchema>;
export type JobBriefInput = z.infer<typeof jobBriefSchema>;
export type UpsertJobDraftInput = z.infer<typeof upsertJobDraftSchema>;
export type AssignFreelancerInput = z.infer<typeof assignFreelancerSchema>;
export type MilestonePlanInput = z.infer<typeof milestonePlanSchema>;
export type MilestonePlanItemInput = z.infer<typeof milestonePlanItemSchema>;
export type MockPaymentWebhookInput = z.infer<typeof mockPaymentWebhookSchema>;
export type SubmissionNotesInput = z.infer<typeof submissionNotesSchema>;

export type PublicUser = {
  id: string;
  email: string;
  role: AppRole;
  name: string;
};

export type JobValidationState = {
  score: number | null;
  summary: string | null;
  gaps: string[];
  clarifyingQuestions: string[];
  lastValidatedAt: string | null;
  isStale: boolean;
  canPublish: boolean;
};

export type JobBriefRecord = {
  overview: string;
  scope: string[];
  deliverables: string[];
  requirements: string[];
  acceptanceCriteria: string[];
  timeline: JobTimeline;
  updatedAt: string;
  validation: JobValidationState;
};

export type FreelancerDirectoryRecord = {
  id: string;
  name: string;
  displayName: string;
  portfolioUrl: string | null;
  skills: string[];
  hourlyRate: number | null;
  ratingAverage: number | null;
};

export type EscrowRecord = {
  status: EscrowStatus;
  fundedAmount: number;
  releasedAmount: number;
  provider: string | null;
  providerReference: string | null;
  fundedAt: string | null;
  releasedAt: string | null;
};

export type MilestoneRecord = {
  id: string;
  sequence: number;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionRecord = {
  id: string;
  revision: number;
  status: SubmissionStatus;
  notes: string | null;
  fileName: string | null;
  fileFormat: string | null;
  fileSizeBytes: number | null;
  fileHash: string | null;
  wordCount: number | null;
  dimensions: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type FreelancerMilestoneSummaryRecord = {
  id: string;
  sequence: number;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueAt: string | null;
  revisionCount: number;
  remainingRevisions: number;
};

export type FreelancerJobRecord = {
  id: string;
  title: string;
  status: JobStatus;
  companyName: string;
  milestones: FreelancerMilestoneSummaryRecord[];
};

export type FreelancerMilestoneDetailRecord = {
  id: string;
  sequence: number;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueAt: string | null;
  job: {
    id: string;
    title: string;
    companyName: string;
  };
  brief: {
    overview: string;
    deliverables: string[];
    acceptanceCriteria: string[];
  };
  revisionCount: number;
  remainingRevisions: number;
  submissionHistory: SubmissionRecord[];
};

export type MockPaymentIntentRecord = {
  intentId: string;
  amount: number;
  currency: string;
  provider: "mock";
  status: "requires_confirmation" | "succeeded";
};

export type JobRecord = {
  id: string;
  title: string;
  budget: number;
  milestoneCount: number;
  status: JobStatus;
  publishedAt: string | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedFreelancer: FreelancerDirectoryRecord | null;
  escrow: EscrowRecord | null;
  milestones: MilestoneRecord[];
  brief: JobBriefRecord;
};

export type ApiSuccess<T> = {
  data: T;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  requestId: string;
};

export const isRegistrationRole = (value: string): value is RegistrationRole =>
  registrationRoles.includes(value as RegistrationRole);
