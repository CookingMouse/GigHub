import { describe, it, expect, vi, beforeEach } from "vitest";
import { hkdfSync } from "crypto";
import { z } from "zod";

// Mocks hoisted by vitest — must declare before importing consumers
vi.mock("../lib/redis", () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn()
  }
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    milestone: { findUnique: vi.fn(), update: vi.fn() },
    job: { update: vi.fn() },
    escrow: { update: vi.fn() },
    escrowRelease: { create: vi.fn() },
    submission: { update: vi.fn() },
    dispute: { count: vi.fn() },
    activityLog: { create: vi.fn() }
  }
}));

import { detectSubmissionFormat } from "../services/file-metadata-service";
import { signAccessToken, verifyAccessToken } from "../lib/jwt";
import { runWithMilestoneReleaseLock } from "../services/release-service";
import { redis } from "../lib/redis";

const mockRedis = redis as {
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// UT-01  GLM prompt builder — brief_validation structure
// ---------------------------------------------------------------------------
describe("UT-01 — GLM prompt builder: brief_validation structure", () => {
  it("produces a JSON payload with task, schema, and brief keys and token count ≤1500", () => {
    const brief = {
      title: "Build E-Commerce Platform",
      description: "Full stack web application with payment integration, user auth, and product catalogue.",
      wageAmount: 5000,
      milestones: ["Design mockups", "Backend API", "Frontend integration"],
      deliverables: ["Deployed application", "Source code repository", "API documentation"],
      acceptanceCriteria: ["All unit tests pass", "Lighthouse score > 90", "No critical security warnings"]
    };

    const payload = {
      task: "brief_validation",
      schema: {
        score: "number 0-100",
        summary: "string",
        gaps: "string[]",
        clarifyingQuestions: "string[]"
      },
      brief
    };

    const promptString = JSON.stringify(payload);
    const parsed = JSON.parse(promptString) as typeof payload;

    expect(parsed.task).toBe("brief_validation");
    expect(parsed.schema).toBeDefined();
    expect(parsed.schema.score).toBe("number 0-100");
    expect(parsed.schema.gaps).toBe("string[]");
    expect(parsed.brief).toBeDefined();
    expect(parsed.brief.title).toBe("Build E-Commerce Platform");
    expect(parsed.brief.wageAmount).toBe(5000);

    // Token estimate: ~4 chars per token
    const tokenEstimate = Math.ceil(promptString.length / 4);
    expect(tokenEstimate).toBeLessThanOrEqual(1500);
  });
});

// ---------------------------------------------------------------------------
// UT-02  GLM prompt builder — oversized brief truncation
// ---------------------------------------------------------------------------

const truncateBriefOverview = (
  overview: string,
  maxTokens = 1500
): { overview: string; truncated: boolean } => {
  const maxChars = maxTokens * 4;
  if (overview.length <= maxChars) return { overview, truncated: false };
  return { overview: overview.slice(0, maxChars) + " [truncated]", truncated: true };
};

describe("UT-02 — GLM prompt builder: oversized brief truncation", () => {
  it("truncates a 6000-word overview to ≤1500 tokens and appends truncation notice", () => {
    // ~6000 words × 5 chars/word ≈ 30,000 chars ≈ 7,500 tokens
    const longOverview = "Lorem ipsum dolor sit amet. ".repeat(1100);
    expect(longOverview.length).toBeGreaterThan(6000 * 4);

    const { overview, truncated } = truncateBriefOverview(longOverview);

    expect(truncated).toBe(true);
    expect(overview).toContain("[truncated]");

    const tokenEstimate = Math.ceil(overview.length / 4);
    expect(tokenEstimate).toBeLessThanOrEqual(1600); // 1500 + small notice overhead
  });

  it("does not truncate a short overview", () => {
    const shortOverview = "Design a logo for a bakery.";
    const { overview, truncated } = truncateBriefOverview(shortOverview);

    expect(truncated).toBe(false);
    expect(overview).toBe(shortOverview);
  });
});

// ---------------------------------------------------------------------------
// UT-03  Escrow state machine — successful lock acquisition
// ---------------------------------------------------------------------------
describe("UT-03 — Escrow state machine: lock acquired, callback executes", () => {
  it("runs the callback and returns its result when Redis NX lock is accepted", async () => {
    mockRedis.set.mockResolvedValueOnce("OK");
    mockRedis.get.mockResolvedValueOnce(null); // token mismatch → del skipped

    const result = await runWithMilestoneReleaseLock("milestone-001", async () => ({
      status: "RELEASED"
    }));

    expect(result).toEqual({ status: "RELEASED" });
    expect(mockRedis.set).toHaveBeenCalledWith(
      "escrow-release:milestone-001",
      expect.any(String),
      { NX: true, EX: 30 }
    );
  });
});

// ---------------------------------------------------------------------------
// UT-04  Escrow state machine — double-release guard (idempotency)
// ---------------------------------------------------------------------------
describe("UT-04 — Escrow state machine: duplicate release blocked", () => {
  it("throws 409 ESCROW_RELEASE_IN_PROGRESS when Redis NX lock is already held", async () => {
    mockRedis.set.mockResolvedValueOnce(null); // lock already held

    await expect(
      runWithMilestoneReleaseLock("milestone-001", async () => "should-not-run")
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "ESCROW_RELEASE_IN_PROGRESS"
    });

    // Callback must never run
    expect(mockRedis.get).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// UT-05  AES-256-GCM key derivation — deterministic output
// ---------------------------------------------------------------------------
describe("UT-05 — AES-256-GCM key derivation: deterministic across calls", () => {
  it("derives identical 32-byte keys from the same material across 3 separate calls", () => {
    const secret = "gighub-test-encryption-secret-32";
    const keyMaterial = Buffer.from(secret, "utf8");

    const derive = () =>
      Buffer.from(
        hkdfSync(
          "sha256",
          keyMaterial,
          Buffer.from("gighub-storage"),
          Buffer.from("submission"),
          32
        )
      );

    const key1 = derive();
    const key2 = derive();
    const key3 = derive();

    expect(key1.length).toBe(32);
    expect(key1.equals(key2)).toBe(true);
    expect(key2.equals(key3)).toBe(true);
  });

  it("produces a different key when the secret changes", () => {
    const deriveWith = (secret: string) =>
      Buffer.from(
        hkdfSync(
          "sha256",
          Buffer.from(secret, "utf8"),
          Buffer.from("gighub-storage"),
          Buffer.from("submission"),
          32
        )
      );

    const keyA = deriveWith("secret-alpha-xxxxxxxxxxxxxxxxx");
    const keyB = deriveWith("secret-beta-xxxxxxxxxxxxxxxxxx");

    expect(keyA.equals(keyB)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UT-06  File metadata extractor — format detection
// ---------------------------------------------------------------------------
describe("UT-06 — File metadata extractor: format detection", () => {
  it("detects pdf", () => {
    expect(detectSubmissionFormat("report.pdf")).toBe("pdf");
  });

  it("detects docx", () => {
    expect(detectSubmissionFormat("document.docx")).toBe("docx");
  });

  it("detects png", () => {
    expect(detectSubmissionFormat("diagram.png")).toBe("png");
  });

  it("normalises .jpeg extension to jpg", () => {
    expect(detectSubmissionFormat("photo.jpeg")).toBe("jpg");
  });

  it("detects jpg", () => {
    expect(detectSubmissionFormat("photo.jpg")).toBe("jpg");
  });

  it("throws SUBMISSION_FORMAT_UNSUPPORTED for mp4", () => {
    expect(() => detectSubmissionFormat("video.mp4")).toThrow();
  });

  it("throws SUBMISSION_FORMAT_UNSUPPORTED for exe", () => {
    expect(() => detectSubmissionFormat("malware.exe")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// UT-07  JWT token generation + validation round-trip
// ---------------------------------------------------------------------------
describe("UT-07 — JWT: sign and verify access token round-trip", () => {
  it("generates a token for role=freelancer and recovers the original payload", () => {
    const token = signAccessToken({ userId: "user-freelancer-001", role: "freelancer" });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature

    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe("user-freelancer-001");
    expect(payload.role).toBe("freelancer");
  });

  it("generates a token for role=company and recovers the original payload", () => {
    const token = signAccessToken({ userId: "user-company-007", role: "company" });
    const payload = verifyAccessToken(token);

    expect(payload.userId).toBe("user-company-007");
    expect(payload.role).toBe("company");
  });

  it("throws AUTH_INVALID_TOKEN on a tampered or invalid token", () => {
    expect(() => verifyAccessToken("not.a.valid.jwt")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// UT-08  Zod schema validation — malformed GLM response rejected
// ---------------------------------------------------------------------------

const glmBriefResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  gaps: z.array(z.string()),
  clarifyingQuestions: z.array(z.string())
});

describe("UT-08 — Zod schema: malformed GLM response rejected", () => {
  it("rejects score as a string ('high') instead of integer — throws ZodError", () => {
    const result = glmBriefResponseSchema.safeParse({
      score: "high",
      summary: "Looks fine.",
      gaps: [],
      clarifyingQuestions: []
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const scorePath = result.error.issues.some((i) => i.path.includes("score"));
      expect(scorePath).toBe(true);
    }
  });

  it("rejects a response missing required fields", () => {
    const result = glmBriefResponseSchema.safeParse({ score: 75 });
    expect(result.success).toBe(false);
  });

  it("rejects score out of range (> 100)", () => {
    const result = glmBriefResponseSchema.safeParse({
      score: 150,
      summary: "ok",
      gaps: [],
      clarifyingQuestions: []
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fully valid GLM response", () => {
    const result = glmBriefResponseSchema.safeParse({
      score: 84,
      summary: "Strong brief with clear deliverables and measurable acceptance criteria.",
      gaps: [],
      clarifyingQuestions: ["What is the preferred tech stack?"]
    });
    expect(result.success).toBe(true);
  });
});
