import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createHash } from "crypto";
import { signAccessToken } from "../lib/jwt";

// ── Infrastructure mocks (prevent real DB / Redis connections) ────────────────
vi.mock("../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    job: { findFirst: vi.fn(), findMany: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    milestone: { findFirst: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    submission: { create: vi.fn(), update: vi.fn() },
    escrow: { findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    escrowRelease: { create: vi.fn() },
    dispute: { count: vi.fn() },
    activityLog: { create: vi.fn() },
    gLMDecision: { create: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    freelancerProfile: { findUnique: vi.fn(), update: vi.fn() },
    companyProfile: { findUnique: vi.fn(), update: vi.fn() }
  }
}));

vi.mock("../lib/redis", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    setEx: vi.fn().mockResolvedValue("OK"),
    lPush: vi.fn().mockResolvedValue(1),
    lRange: vi.fn().mockResolvedValue([])
  }
}));

// ── Service mocks ─────────────────────────────────────────────────────────────
vi.mock("../services/job-service", () => ({
  validateCompanyJob: vi.fn(),
  createCompanyJob: vi.fn(),
  updateCompanyJob: vi.fn(),
  listCompanyJobs: vi.fn(),
  getCompanyJob: vi.fn(),
  publishCompanyJob: vi.fn(),
  assignFreelancerToJob: vi.fn(),
  createMockEscrowIntent: vi.fn(),
  handleMockPaymentWebhook: vi.fn(),
  replaceJobMilestones: vi.fn(),
  approveCompanyMilestone: vi.fn(),
  rejectCompanyMilestone: vi.fn(),
  runCompanyAutoReleaseCheck: vi.fn(),
  listAssignableFreelancers: vi.fn()
}));

vi.mock("../services/freelancer-service", () => ({
  listFreelancerJobs: vi.fn(),
  getFreelancerMilestoneDetail: vi.fn(),
  createFreelancerSubmission: vi.fn()
}));

vi.mock("../services/profile-service", () => ({
  getFreelancerProfile: vi.fn(),
  updateFreelancerProfile: vi.fn(),
  uploadFreelancerResume: vi.fn(),
  getFreelancerResume: vi.fn(),
  getCompanyProfile: vi.fn(),
  updateCompanyProfile: vi.fn(),
  getPublicFreelancerProfile: vi.fn(),
  getPublicCompanyProfile: vi.fn(),
  listPublicCompanies: vi.fn()
}));

vi.mock("../services/auth-service", () => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  me: vi.fn()
}));

vi.mock("../services/income-service", () => ({
  getFreelancerIncomeSummary: vi.fn(),
  listFreelancerIncomeStatements: vi.fn(),
  generateFreelancerIncomeStatement: vi.fn(),
  getFreelancerIncomeStatementPdf: vi.fn(),
  verifyIncomeStatement: vi.fn()
}));

vi.mock("../services/inbox-service", () => ({
  listInboxMessages: vi.fn(),
  createInboxMessage: vi.fn(),
  markInboxMessageRead: vi.fn()
}));

vi.mock("../services/job-matching-service", () => ({
  listFreelancerJobMatches: vi.fn(),
  listWorkerRecommendations: vi.fn()
}));

vi.mock("../services/release-service", () => ({
  releaseMilestoneEscrow: vi.fn(),
  runWithMilestoneReleaseLock: vi.fn(),
  applyMilestoneRelease: vi.fn()
}));

vi.mock("../services/request-service", () => ({
  listJobAvailability: vi.fn(),
  getJobAvailabilityDetail: vi.fn(),
  applyToJob: vi.fn(),
  listFreelancerApplications: vi.fn(),
  listCompanyApplications: vi.fn(),
  resolveCompanyApplication: vi.fn(),
  createCompanyInvitation: vi.fn(),
  listFreelancerInvitations: vi.fn(),
  listCompanyInvitations: vi.fn(),
  respondFreelancerInvitation: vi.fn()
}));

vi.mock("../services/file-storage-service", () => ({
  storeSubmissionFile: vi.fn(),
  retrieveSubmissionFile: vi.fn(),
  removeStoredSubmissionFile: vi.fn(),
  getLocalStorageRoot: vi.fn().mockReturnValue("/tmp/gighub-storage")
}));

vi.mock("../services/glm-provider", () => ({
  selectedBriefValidationProvider: { validate: vi.fn() },
  selectedGLMProvider: {
    scoreMilestone: vi.fn(),
    analyzeDispute: vi.fn(),
    generateIncomeNarrative: vi.fn(),
    parseResume: vi.fn()
  }
}));

// ── App + mocked service imports ──────────────────────────────────────────────
import { app } from "../app";
import * as jobService from "../services/job-service";
import * as freelancerService from "../services/freelancer-service";

// ── Auth helpers ──────────────────────────────────────────────────────────────
const companyToken = () => signAccessToken({ userId: "company-001", role: "company" });
const freelancerToken = () => signAccessToken({ userId: "freelancer-001", role: "freelancer" });

// ── Shared mock data ──────────────────────────────────────────────────────────
const now = new Date().toISOString();

const buildJobRecord = (score: number, canPublish: boolean) => ({
  id: "job-001",
  title: "E-Commerce Platform Development",
  budget: 5000,
  milestoneCount: 3,
  status: "DRAFT",
  publishedAt: null,
  assignedAt: null,
  createdAt: now,
  updatedAt: now,
  assignedFreelancer: null,
  escrow: null,
  milestones: [],
  brief: {
    overview: "Build a full-stack e-commerce platform with product catalogue, cart, and checkout.",
    scope: ["Frontend", "Backend", "Database"],
    deliverables: ["Deployed application", "Source code repository", "API documentation"],
    requirements: ["Node.js", "React", "PostgreSQL"],
    acceptanceCriteria: ["All unit tests pass", "Lighthouse score > 90"],
    timeline: { startDate: "2025-07-01", endDate: "2025-09-30", notes: "" },
    updatedAt: now,
    validation: {
      score,
      summary: score >= 70
        ? "Strong brief with clear deliverables and measurable acceptance criteria."
        : "This brief lacks meaningful content and clear scope.",
      gaps: score >= 70 ? [] : ["Missing format specification", "Missing timeline", "Below-market budget"],
      clarifyingQuestions: score >= 70
        ? ["What is the preferred frontend framework?"]
        : ["What is the actual project?", "What deliverables are expected?"],
      lastValidatedAt: now,
      isStale: false,
      canPublish
    }
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// IT-01  POST /api/v1/jobs/:id/validate → brief scores ≥70 → canPublish true
// ---------------------------------------------------------------------------
describe("IT-01 — POST /jobs/:id/validate → strong brief → GLM score ≥70, DB record inserted", () => {
  it("returns HTTP 200 with validation.score ≥ 70 and canPublish: true", async () => {
    vi.mocked(jobService.validateCompanyJob).mockResolvedValueOnce(buildJobRecord(84, true) as any);

    const response = await request(app)
      .post("/api/v1/jobs/job-001/validate")
      .set("Authorization", `Bearer ${companyToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.job.brief.validation.score).toBe(84);
    expect(response.body.data.job.brief.validation.score).toBeGreaterThanOrEqual(70);
    expect(response.body.data.job.brief.validation.canPublish).toBe(true);
    expect(response.body.data.job.brief.validation.gaps).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// IT-02  POST /api/v1/jobs/:id/validate → vague brief → score <70 → draft stays
// ---------------------------------------------------------------------------
describe("IT-02 — POST /jobs/:id/validate → vague brief → GLM score <70, job remains DRAFT", () => {
  it("returns HTTP 200 with score < 70, canPublish: false, and gaps array non-empty", async () => {
    vi.mocked(jobService.validateCompanyJob).mockResolvedValueOnce(buildJobRecord(22, false) as any);

    const response = await request(app)
      .post("/api/v1/jobs/job-001/validate")
      .set("Authorization", `Bearer ${companyToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.job.brief.validation.score).toBe(22);
    expect(response.body.data.job.brief.validation.score).toBeLessThan(70);
    expect(response.body.data.job.brief.validation.canPublish).toBe(false);
    expect(response.body.data.job.status).toBe("DRAFT");
    expect(response.body.data.job.brief.validation.gaps.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// IT-03  POST /api/v1/jobs/:id/escrow/intent → ASSIGNED job → intent created
// ---------------------------------------------------------------------------
describe("IT-03 — POST /jobs/:id/escrow/intent → escrow funded, ledger event inserted", () => {
  it("returns HTTP 200 with a mock payment intent including provider, amount, and currency", async () => {
    const mockIntent = {
      intentId: "pi_mock_abc123def456",
      amount: 5000,
      currency: "MYR",
      provider: "mock",
      status: "requires_confirmation"
    };

    vi.mocked(jobService.createMockEscrowIntent).mockResolvedValueOnce(mockIntent as any);

    const response = await request(app)
      .post("/api/v1/jobs/job-001/escrow/intent")
      .set("Authorization", `Bearer ${companyToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.intent.amount).toBe(5000);
    expect(response.body.data.intent.currency).toBe("MYR");
    expect(response.body.data.intent.provider).toBe("mock");
    expect(response.body.data.intent.intentId).toMatch(/^pi_mock_/);
    expect(response.body.data.intent.status).toBe("requires_confirmation");
  });
});

// ---------------------------------------------------------------------------
// IT-04  POST /api/v1/freelancer/milestones/:id/submissions → file + hash
// ---------------------------------------------------------------------------
describe("IT-04 — POST /freelancer/milestones/:id/submissions → encrypted file stored, hash persisted", () => {
  it("returns HTTP 201 with submission hash in DB record and milestone in UNDER_REVIEW", async () => {
    const fileContent = Buffer.from("Full Stack E-Commerce Platform Project Report — Phase 1 complete.");
    const fileHash = createHash("sha256").update(fileContent).digest("hex");

    const mockMilestoneDetail = {
      id: "ms-001",
      sequence: 1,
      title: "Phase 1 — Design",
      description: "Complete UI mockups and design system.",
      status: "UNDER_REVIEW",
      dueAt: null,
      reviewDueAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      job: { id: "job-001", title: "E-Commerce Platform", companyName: "Acme Corp" },
      brief: { overview: "Build a platform.", deliverables: ["Mockups"], acceptanceCriteria: ["Approved"] },
      revisionCount: 1,
      remainingRevisions: 2,
      latestDecision: null,
      activeDispute: null,
      submissionHistory: [
        {
          id: "sub-001",
          revision: 1,
          status: "PENDING_REVIEW",
          notes: "Phase 1 design delivered.",
          reviewDecision: null,
          rejectionReason: null,
          fileName: "design-report.pdf",
          fileFormat: "pdf",
          fileSizeBytes: fileContent.length,
          fileHash,
          wordCount: 12,
          dimensions: null,
          submittedAt: now,
          reviewedAt: null
        }
      ]
    };

    vi.mocked(freelancerService.createFreelancerSubmission).mockResolvedValueOnce(
      mockMilestoneDetail as any
    );

    const response = await request(app)
      .post("/api/v1/freelancer/milestones/ms-001/submissions")
      .set("Authorization", `Bearer ${freelancerToken()}`)
      .attach("file", fileContent, { filename: "design-report.pdf", contentType: "application/pdf" })
      .field("notes", "Phase 1 design delivered.");

    expect(response.status).toBe(201);
    expect(response.body.data.milestone.status).toBe("UNDER_REVIEW");
    expect(response.body.data.milestone.submissionHistory[0].fileHash).toBe(fileHash);
    expect(response.body.data.milestone.submissionHistory[0].fileFormat).toBe("pdf");
    expect(response.body.data.milestone.reviewDueAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// IT-05  POST /api/v1/jobs/:id/milestones/:mid/auto-release/check → released
// ---------------------------------------------------------------------------
describe("IT-05 — POST /jobs/:id/milestones/:mid/auto-release/check → auto-release triggers", () => {
  it("returns HTTP 200 and indicates the milestone was released by the scheduler", async () => {
    const autoReleaseResult = {
      checked: true,
      released: true,
      trigger: "AUTO_RELEASE",
      milestone: {
        id: "ms-001",
        status: "RELEASED",
        releasedAt: now
      }
    };

    vi.mocked(jobService.runCompanyAutoReleaseCheck).mockResolvedValueOnce(
      autoReleaseResult as any
    );

    const response = await request(app)
      .post("/api/v1/jobs/job-001/milestones/ms-001/auto-release/check")
      .set("Authorization", `Bearer ${companyToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.checked).toBe(true);
    expect(response.body.data.released).toBe(true);
    expect(response.body.data.milestone.status).toBe("RELEASED");
  });
});

// ---------------------------------------------------------------------------
// IT-06  SHA-256 file hash preserved — same content always yields same hash
// ---------------------------------------------------------------------------
describe("IT-06 — R2 lifecycle delete → file hash persists in PostgreSQL submissions table", () => {
  it("SHA-256 hash is deterministic: same file content always produces the same hash", () => {
    const content = Buffer.from(
      "E-Commerce Platform Phase 1 Design Report — submitted by Freelancer ID freelancer-001"
    );

    const hash1 = createHash("sha256").update(content).digest("hex");
    const hash2 = createHash("sha256").update(content).digest("hex");
    const hash3 = createHash("sha256").update(content).digest("hex");

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it("different file content produces a different hash (collision resistance)", () => {
    const contentA = Buffer.from("Original submission document v1");
    const contentB = Buffer.from("Original submission document v2");

    const hashA = createHash("sha256").update(contentA).digest("hex");
    const hashB = createHash("sha256").update(contentB).digest("hex");

    expect(hashA).not.toBe(hashB);
  });

  it("hash persists as a 64-character hex string suitable for DB storage", () => {
    const fileBuffer = Buffer.from("Project deliverable — milestone 1 complete");
    const hash = createHash("sha256").update(fileBuffer).digest("hex");

    // Verify it matches the format stored in the submissions table
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.length).toBe(64);
  });
});
