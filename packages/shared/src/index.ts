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
export const jobValidationThreshold = 70;

export type AppRole = (typeof appRoles)[number];
export type RegistrationRole = (typeof registrationRoles)[number];
export type JobStatus = (typeof jobStatuses)[number];

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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JobTimeline = z.infer<typeof jobTimelineSchema>;
export type JobBriefInput = z.infer<typeof jobBriefSchema>;
export type UpsertJobDraftInput = z.infer<typeof upsertJobDraftSchema>;

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

export type JobRecord = {
  id: string;
  title: string;
  budget: number;
  milestoneCount: number;
  status: JobStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
