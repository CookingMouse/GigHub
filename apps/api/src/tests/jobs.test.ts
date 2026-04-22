import request from "supertest";
import type { UpsertJobDraftInput } from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { app } from "../app";

type Agent = ReturnType<typeof request.agent>;

const strongPayload = (): UpsertJobDraftInput => ({
  title: "Landing page redesign for SME financing campaign",
  budget: 3200,
  milestoneCount: 2,
  brief: {
    overview:
      "We need a mobile-first campaign landing page that explains our SME financing offer, captures qualified leads, and gives the internal marketing team a handoff-ready page structure.",
    scope: [
      "Design a responsive landing page layout for mobile and desktop.",
      "Prepare a structured content hierarchy for the campaign funnel."
    ],
    deliverables: [
      "One final Figma file with the approved landing page design.",
      "A short handoff note covering sections, copy placeholders, and CTA placement."
    ],
    requirements: [
      "Use our existing green brand palette and maintain readability on smaller screens."
    ],
    acceptanceCriteria: [
      "All required sections are present, CTA hierarchy is clear, and the design is ready for developer handoff."
    ],
    timeline: {
      startDate: "2026-04-25",
      endDate: "2026-05-02",
      notes: "The first review should happen within three working days so the team can launch the campaign on schedule."
    }
  }
});

const weakPayload = (): UpsertJobDraftInput => ({
  title: "Need design help",
  budget: 600,
  milestoneCount: 3,
  brief: {
    overview: "Need something fast.",
    scope: ["TBD"],
    deliverables: ["Something usable"],
    requirements: [],
    acceptanceCriteria: [],
    timeline: {
      startDate: "",
      endDate: "",
      notes: "ASAP"
    }
  }
});

const clearData = async () => {
  await prisma.incomeStatementLineItem.deleteMany();
  await prisma.incomeStatement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.gLMDecision.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.escrowRelease.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.jobBrief.deleteMany();
  await prisma.job.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.freelancerProfile.deleteMany();
  await prisma.user.deleteMany();
};

const registerCompany = async (agent: Agent, email = "company@example.com") => {
  await agent.post("/api/v1/auth/register").send({
    name: "Kampung Labs",
    email,
    password: "StrongPass123",
    role: "company"
  });
};

const registerFreelancer = async (agent: Agent) => {
  await agent.post("/api/v1/auth/register").send({
    name: "Aina Musa",
    email: "aina@example.com",
    password: "StrongPass123",
    role: "freelancer"
  });
};

describe("job routes", () => {
  beforeAll(async () => {
    await prisma.$connect();

    if (!redis.isOpen) {
      await redis.connect();
    }
  });

  beforeEach(async () => {
    const sessionKeys = await redis.keys("session:*");

    if (sessionKeys.length > 0) {
      await redis.del(sessionKeys);
    }

    await clearData();
  });

  afterAll(async () => {
    await clearData();

    if (redis.isOpen) {
      await redis.quit();
    }

    await prisma.$disconnect();
  });

  it("creates and fetches a company-owned draft job", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const createResponse = await company.post("/api/v1/jobs").send(strongPayload());

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.job.status).toBe("DRAFT");
    expect(createResponse.body.data.job.milestoneCount).toBe(2);
    expect(createResponse.body.data.job.brief.validation.isStale).toBe(true);

    const detailResponse = await company.get(`/api/v1/jobs/${createResponse.body.data.job.id}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.job.title).toMatch(/landing page redesign/i);
  });

  it("blocks freelancer accounts from company job routes", async () => {
    const freelancer = request.agent(app);
    await registerFreelancer(freelancer);

    const response = await freelancer.post("/api/v1/jobs").send(strongPayload());

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("AUTH_FORBIDDEN");
  });

  it("validates and publishes a strong brief", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const createResponse = await company.post("/api/v1/jobs").send(strongPayload());
    const jobId = createResponse.body.data.job.id as string;

    const validateResponse = await company.post(`/api/v1/jobs/${jobId}/validate`);

    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body.data.job.brief.validation.score).toBeGreaterThanOrEqual(70);
    expect(validateResponse.body.data.job.brief.validation.isStale).toBe(false);
    expect(validateResponse.body.data.job.brief.validation.canPublish).toBe(true);

    const publishResponse = await company.post(`/api/v1/jobs/${jobId}/publish`);

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.data.job.status).toBe("OPEN");
    expect(publishResponse.body.data.job.publishedAt).toBeTruthy();
  });

  it("marks validation stale after the draft is edited", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const createResponse = await company.post("/api/v1/jobs").send(strongPayload());
    const jobId = createResponse.body.data.job.id as string;

    await company.post(`/api/v1/jobs/${jobId}/validate`);

    const editedPayload = strongPayload();
    editedPayload.brief.overview =
      "We need the same campaign landing page, but the company has now added a second financing persona and a different CTA hierarchy.";

    const updateResponse = await company.patch(`/api/v1/jobs/${jobId}`).send(editedPayload);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.job.brief.validation.isStale).toBe(true);

    const publishResponse = await company.post(`/api/v1/jobs/${jobId}/publish`);

    expect(publishResponse.status).toBe(409);
    expect(publishResponse.body.code).toBe("JOB_VALIDATION_STALE");
  });

  it("blocks publish when the validated brief is still below threshold", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const createResponse = await company.post("/api/v1/jobs").send(weakPayload());
    const jobId = createResponse.body.data.job.id as string;

    const validateResponse = await company.post(`/api/v1/jobs/${jobId}/validate`);

    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body.data.job.brief.validation.score).toBeLessThan(70);
    expect(validateResponse.body.data.job.brief.validation.canPublish).toBe(false);

    const publishResponse = await company.post(`/api/v1/jobs/${jobId}/publish`);

    expect(publishResponse.status).toBe(409);
    expect(publishResponse.body.code).toBe("JOB_VALIDATION_FAILED");
  });
});
