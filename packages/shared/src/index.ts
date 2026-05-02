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
export const jobApplicationStatuses = ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;
export const jobInvitationStatuses = ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"] as const;
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
export const disputeResolutionOutcomes = ["release_funds", "request_revision"] as const;
export const statementStatuses = ["GENERATED", "VERIFIED", "REVOKED"] as const;
export const submissionRevisionLimit = Infinity;
export const jobValidationThreshold = 70;

export type AppRole = (typeof appRoles)[number];
export type RegistrationRole = (typeof registrationRoles)[number];
export type JobStatus = (typeof jobStatuses)[number];
export type JobApplicationStatus = (typeof jobApplicationStatuses)[number];
export type JobInvitationStatus = (typeof jobInvitationStatuses)[number];
export type EscrowStatus = (typeof escrowStatuses)[number];
export type MilestoneStatus = (typeof milestoneStatuses)[number];
export type SubmissionStatus = (typeof submissionStatuses)[number];
export type SupportedSubmissionFormat = (typeof supportedSubmissionFormats)[number];
export type DisputeResolutionOutcome = (typeof disputeResolutionOutcomes)[number];
export type StatementStatus = (typeof statementStatuses)[number];

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(registrationRoles)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(appRoles).optional()
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

export const createJobApplicationSchema = z.object({
  coverNote: z.string().trim().max(2000).optional().default("")
});

export const createJobInvitationSchema = z.object({
  freelancerId: z.string().trim().min(1).max(191),
  note: z.string().trim().max(2000).optional().default("")
});

export const respondJobInvitationSchema = z.object({
  action: z.enum(["accept", "reject"])
});

export const createConversationThreadSchema = z.object({
  participantIds: z.array(z.string().trim().min(1).max(191)).min(1).max(10),
  subject: z.string().trim().max(160).optional().default(""),
  jobId: z.string().trim().min(1).max(191).optional()
});

export const createConversationMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000).optional(),
  encryptedBody: z.string().optional(),
  iv: z.string().optional(),
  encryptedKeyForSender: z.string().optional(),
  encryptedKeyForRecipient: z.string().optional(),
  isEncrypted: z.boolean().optional(),
}).refine(
  (d) => d.body || (d.encryptedBody && d.iv && d.encryptedKeyForSender && d.encryptedKeyForRecipient),
  { message: "Provide either body (plaintext) or all four encrypted fields." }
);

export const updateFreelancerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  portfolioUrl: z.string().trim().url().max(255).optional().or(z.literal("")),
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(4000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  pastProjects: z.array(z.string().trim().min(1).max(500)).max(100).optional(),
  skills: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  experience: z.array(z.object({ role: z.string(), company: z.string(), period: z.string(), desc: z.string() })).optional(),
  portfolio: z.array(z.object({ title: z.string(), category: z.string(), deliverable: z.string() })).optional(),
  languages: z.array(z.object({ lang: z.string(), level: z.string() })).optional()
});

export const updateCompanyProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(120).optional(),
  website: z.string().trim().url().max(255).optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional(),
  about: z.string().trim().max(4000).optional()
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

export const rejectMilestoneSchema = z.object({
  rejectionReason: z.string().trim().min(10).max(2000)
});

export const resolveDisputeSchema = z.object({
  outcome: z.enum(disputeResolutionOutcomes),
  resolutionSummary: z.string().trim().min(10).max(2000),
  adminNote: z.string().trim().max(2000).optional().default("")
});

export const generateIncomeStatementSchema = z.object({
  periodStart: z.string().trim().datetime(),
  periodEnd: z.string().trim().datetime()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JobTimeline = z.infer<typeof jobTimelineSchema>;
export type JobBriefInput = z.infer<typeof jobBriefSchema>;
export type UpsertJobDraftInput = z.infer<typeof upsertJobDraftSchema>;
export type AssignFreelancerInput = z.infer<typeof assignFreelancerSchema>;
export type CreateJobApplicationInput = z.infer<typeof createJobApplicationSchema>;
export type CreateJobInvitationInput = z.infer<typeof createJobInvitationSchema>;
export type RespondJobInvitationInput = z.infer<typeof respondJobInvitationSchema>;
export type CreateConversationThreadInput = z.infer<typeof createConversationThreadSchema>;
export type CreateConversationMessageInput = z.infer<typeof createConversationMessageSchema>;
export type UpdateFreelancerProfileInput = z.infer<typeof updateFreelancerProfileSchema>;
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
export type MilestonePlanInput = z.infer<typeof milestonePlanSchema>;
export type MilestonePlanItemInput = z.infer<typeof milestonePlanItemSchema>;
export type MockPaymentWebhookInput = z.infer<typeof mockPaymentWebhookSchema>;
export type SubmissionNotesInput = z.infer<typeof submissionNotesSchema>;
export type RejectMilestoneInput = z.infer<typeof rejectMilestoneSchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
export type GenerateIncomeStatementInput = z.infer<typeof generateIncomeStatementSchema>;

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
  hasResume: boolean;
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
  submittedAt: string | null;
  approvedAt: string | null;
  releasedAt: string | null;
  reviewDueAt: string | null;
  revisionRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestSubmission: SubmissionRecord | null;
  latestDecision: GLMDecisionRecord | null;
  activeDispute: DisputeRecord | null;
};

export type SubmissionRecord = {
  id: string;
  revision: number;
  status: SubmissionStatus;
  notes: string | null;
  reviewDecision: string | null;
  rejectionReason: string | null;
  fileName: string | null;
  fileFormat: string | null;
  fileSizeBytes: number | null;
  fileHash: string | null;
  wordCount: number | null;
  dimensions: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type RequirementScoreRecord = {
  requirement: string;
  score: number;
};

export type GLMDecisionRecord = {
  decisionType: "BRIEF_VALIDATION" | "MILESTONE_SCORING" | "DISPUTE_ANALYSIS";
  overallScore: number | null;
  passFail: string | null;
  recommendation: string | null;
  requirementScores: RequirementScoreRecord[];
  badFaithFlags: string[];
  reasoning: string | null;
  createdAt: string;
};

export type DisputeRecord = {
  id: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  rejectionReason: string;
  resolutionType: string | null;
  resolutionSummary: string | null;
  adminNote: string | null;
  openedAt: string;
  resolvedAt: string | null;
  latestDecision: GLMDecisionRecord | null;
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
  reviewDueAt: string | null;
  lastRejection: { reason: string; rejectedAt: string } | null;
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
  reviewDueAt: string | null;
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
  latestDecision: GLMDecisionRecord | null;
  activeDispute: DisputeRecord | null;
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

export type AdminDisputeListRecord = {
  id: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  jobId: string;
  jobTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  companyName: string;
  freelancerName: string;
  rejectionReason: string;
  recommendation: string | null;
  badFaithFlags: string[];
  openedAt: string;
};

export type AdminDisputeDetailRecord = {
  id: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  rejectionReason: string;
  resolutionType: string | null;
  resolutionSummary: string | null;
  adminNote: string | null;
  openedAt: string;
  resolvedAt: string | null;
  job: {
    id: string;
    title: string;
    companyName: string;
    freelancerName: string;
  };
  milestone: MilestoneRecord;
  submission: SubmissionRecord;
  milestoneDecision: GLMDecisionRecord | null;
  disputeDecision: GLMDecisionRecord | null;
};

export type IncomeStatementLineItemRecord = {
  id: string;
  milestoneId: string;
  jobTitle: string;
  companyName: string;
  amount: number;
  releasedAt: string;
  category: string | null;
};

export type IncomeStatementRecord = {
  id: string;
  freelancerId: string;
  periodStart: string;
  periodEnd: string;
  totalEarned: number;
  totalJobs: number;
  totalMilestones: number;
  avgMonthlyIncome: number;
  currency: string;
  generatedAt: string;
  pdfStorageKey: string | null;
  verifyToken: string;
  glmNarrative: string | null;
  status: StatementStatus;
  platformServiceFee: number;
  estimatedOperatingExpenses: number;
  netIncome: number;
  socsoProvisioning: number;
  epfProvisioning: number;
  amountAfterStatutory: number;
  lineItems: IncomeStatementLineItemRecord[];
};

export type IncomeSummaryRecord = {
  totalEarned: number;
  releasedMilestones: number;
  completedJobs: number;
  avgMilestoneValue: number;
  latestStatement: IncomeStatementRecord | null;
};

export type JobMatchRecord = {
  jobId: string;
  title: string;
  companyName: string;
  budget: number;
  milestoneCount: number;
  publishedAt: string | null;
  matchScore: number;
  reasons: string[];
  requiredSkills: string[];
};

export type WorkerRecommendationRecord = {
  freelancerId: string;
  name: string;
  displayName: string;
  headline: string | null;
  skills: string[];
  matchScore: number;
  reasons: string[];
  bestMatchJobTitle: string;
};

export type JobAvailabilityRecord = {
  id: string;
  title: string;
  companyName: string;
  budget: number;
  milestoneCount: number;
  publishedAt: string | null;
  description?: string;
};

export type JobAvailabilityDetailRecord = JobAvailabilityRecord & {
  company: {
    name: string;
    industry: string | null;
    website: string | null;
    about: string | null;
  };
  brief: {
    overview: string;
    deliverables: string[];
    acceptanceCriteria: string[];
  };
};

export type JobApplicationRecord = {
  id: string;
  jobId: string;
  jobTitle: string;
  status: JobApplicationStatus;
  coverNote: string | null;
  appliedAt: string;
  updatedAt: string;
};

export type CompanyJobApplicationRecord = {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  freelancerDisplayName: string;
  status: JobApplicationStatus;
  coverNote: string | null;
  appliedAt: string;
};

export type JobInvitationRecord = {
  id: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  note: string | null;
  status: JobInvitationStatus;
  createdAt: string;
  respondedAt: string | null;
};

export type CompanyJobInvitationRecord = {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  note: string | null;
  status: JobInvitationStatus;
  createdAt: string;
  respondedAt: string | null;
};

export type ConversationThreadRecord = {
  id: string;
  subject: string | null;
  jobId: string | null;
  updatedAt: string;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: AppRole;
  }>;
  lastMessage: {
    senderName: string;
    body: string | null;
    isEncrypted: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
};

export type ConversationMessageRecord = {
  id: string;
  senderId: string;
  senderName: string;
  body: string | null;
  encryptedBody: string | null;
  iv: string | null;
  encryptedKeyForSender: string | null;
  encryptedKeyForRecipient: string | null;
  isEncrypted: boolean;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
};

export type FreelancerProfileRecord = {
  displayName: string;
  portfolioUrl: string | null;
  skills: string[];
  headline: string | null;
  bio: string | null;
  experienceYears: number | null;
  pastProjects: string[];
  resumeFileName: string | null;
  resumeUploadedAt: string | null;
  hourlyRate: number | null;
  experience: Array<{ role: string; company: string; period: string; desc: string }> | null;
  portfolio: Array<{ title: string; category: string; deliverable: string }> | null;
  languages: Array<{ lang: string; level: string }> | null;
  glmMatchScore: number | null;
};

export type CompanyProfileRecord = {
  companyName: string;
  website: string | null;
  industry: string | null;
  about: string | null;
  postedJobs: Array<{
    id: string;
    title: string;
    status: JobStatus;
    updatedAt: string;
  }>;
};

export type PublicCompanyProfileRecord = {
  id: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  about: string | null;
};

export type PublicFreelancerProfileRecord = {
  id: string;
  name: string;
  displayName: string;
  portfolioUrl: string | null;
  skills: string[];
  headline: string | null;
  bio: string | null;
  experienceYears: number | null;
};

export type AdminAuditLogRecord = {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  payload: unknown;
  createdAt: string;
};

export type AdminIncomeStatementRecord = {
  id: string;
  freelancerName: string;
  freelancerEmail: string;
  periodStart: string;
  periodEnd: string;
  totalEarned: number;
  totalJobs: number;
  totalMilestones: number;
  generatedAt: string;
  verifyToken: string;
  status: StatementStatus;
};

export type AdminJobTraceRecord = {
  id: string;
  title: string;
  status: JobStatus;
  companyName: string;
  freelancerName: string | null;
  escrow: EscrowRecord | null;
  milestones: MilestoneRecord[];
  glmDecisions: GLMDecisionRecord[];
  auditLogs: AdminAuditLogRecord[];
};

export type DemoAccountRecord = {
  role: AppRole;
  email: string;
  password: string;
  label: string;
};

export type ReadinessCheckRecord = {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type DemoReadinessRecord = {
  status: "ready" | "needs_seed" | "degraded";
  generatedAt: string;
  providers: {
    glm: "mock" | "live";
    payments: string;
    storage: string;
  };
  checks: ReadinessCheckRecord[];
  demoAccounts: DemoAccountRecord[];
  demoFlow: string[];
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
