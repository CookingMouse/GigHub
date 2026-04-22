import request from "supertest";
import type { MilestonePlanInput, UpsertJobDraftInput } from "@gighub/shared";
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

const registerFreelancer = async (
  agent: Agent,
  overrides: { email?: string; name?: string } = {}
) => {
  const email = overrides.email ?? "aina@example.com";
  const name = overrides.name ?? "Aina Musa";

  await agent.post("/api/v1/auth/register").send({
    name,
    email,
    password: "StrongPass123",
    role: "freelancer"
  });

  return prisma.user.findUniqueOrThrow({
    where: {
      email
    },
    include: {
      freelancerProfile: true
    }
  });
};

const publishJob = async (company: Agent, payload: UpsertJobDraftInput = strongPayload()) => {
  const createResponse = await company.post("/api/v1/jobs").send(payload);
  const jobId = createResponse.body.data.job.id as string;

  await company.post(`/api/v1/jobs/${jobId}/validate`);
  await company.post(`/api/v1/jobs/${jobId}/publish`);

  return jobId;
};

const twoMilestonePlan = (): MilestonePlanInput => ({
  milestones: [
    {
      sequence: 1,
      title: "Design direction and content structure",
      description: "Initial design pass and content hierarchy for review.",
      amount: 1600,
      dueAt: "2026-05-02"
    },
    {
      sequence: 2,
      title: "Final delivery and handoff",
      description: "Approved design file and implementation notes.",
      amount: 1600,
      dueAt: "2026-05-09"
    }
  ]
});

describe("job routes", () => {
  beforeAll(async () => {
    await prisma.$connect();

    if (!redis.isOpen) {
      await redis.connect();
    }
  });

  beforeEach(async () => {
    const sessionKeys = await redis.keys("session:*");
    const paymentEventKeys = await redis.keys("payment-event:*");

    if (sessionKeys.length > 0) {
      await redis.del(sessionKeys);
    }

    if (paymentEventKeys.length > 0) {
      await redis.del(paymentEventKeys);
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

  it("lists freelancer profiles for company assignment", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const freelancerA = request.agent(app);
    const freelancerB = request.agent(app);

    await registerFreelancer(freelancerA, {
      email: "aina@example.com",
      name: "Aina Musa"
    });
    await registerFreelancer(freelancerB, {
      email: "hakim@example.com",
      name: "Hakim Salleh"
    });

    await prisma.freelancerProfile.update({
      where: {
        userId: (
          await prisma.user.findUniqueOrThrow({
            where: {
              email: "aina@example.com"
            }
          })
        ).id
      },
      data: {
        portfolioUrl: "https://portfolio.example.com/aina",
        skills: ["UI Design", "Landing Pages"],
        hourlyRate: "120.00",
        ratingAverage: "4.80"
      }
    });

    const response = await company.get("/api/v1/freelancers");

    expect(response.status).toBe(200);
    expect(response.body.data.freelancers).toHaveLength(2);
    expect(response.body.data.freelancers[0]).toHaveProperty("displayName");
  });

  it("assigns a freelancer, creates a mock escrow intent, and funds the job idempotently", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const freelancer = request.agent(app);
    const freelancerUser = await registerFreelancer(freelancer);
    const jobId = await publishJob(company);

    const assignResponse = await company.post(`/api/v1/jobs/${jobId}/assign`).send({
      freelancerId: freelancerUser.id
    });

    expect(assignResponse.status).toBe(200);
    expect(assignResponse.body.data.job.status).toBe("ASSIGNED");
    expect(assignResponse.body.data.job.assignedFreelancer.id).toBe(freelancerUser.id);

    const intentResponse = await company.post(`/api/v1/jobs/${jobId}/escrow/intent`);

    expect(intentResponse.status).toBe(200);
    expect(intentResponse.body.data.intent.provider).toBe("mock");

    const webhookPayload = {
      eventId: "mock_evt_assign_flow",
      intentId: intentResponse.body.data.intent.intentId as string,
      type: "payment.succeeded"
    };

    const webhookResponse = await request(app)
      .post("/api/v1/webhooks/payments/mock")
      .send(webhookPayload);

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body.data.job.status).toBe("ESCROW_FUNDED");
    expect(webhookResponse.body.data.job.escrow.status).toBe("FUNDED");

    const duplicateResponse = await request(app)
      .post("/api/v1/webhooks/payments/mock")
      .send(webhookPayload);

    expect(duplicateResponse.status).toBe(200);
    expect(duplicateResponse.body.data.duplicate).toBe(true);
    expect(duplicateResponse.body.data.job.status).toBe("ESCROW_FUNDED");
  });

  it("blocks escrow intent creation before a freelancer is assigned", async () => {
    const company = request.agent(app);
    await registerCompany(company);
    const jobId = await publishJob(company);

    const response = await company.post(`/api/v1/jobs/${jobId}/escrow/intent`);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ESCROW_INTENT_UNAVAILABLE");
  });

  it("saves milestones only after funded escrow and flips the job to in progress", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const freelancer = request.agent(app);
    const freelancerUser = await registerFreelancer(freelancer);
    const jobId = await publishJob(company);

    await company.post(`/api/v1/jobs/${jobId}/assign`).send({
      freelancerId: freelancerUser.id
    });

    const intentResponse = await company.post(`/api/v1/jobs/${jobId}/escrow/intent`);

    await request(app).post("/api/v1/webhooks/payments/mock").send({
      eventId: "mock_evt_milestones",
      intentId: intentResponse.body.data.intent.intentId,
      type: "payment.succeeded"
    });

    const saveResponse = await company.put(`/api/v1/jobs/${jobId}/milestones`).send(twoMilestonePlan());

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.data.job.status).toBe("IN_PROGRESS");
    expect(saveResponse.body.data.job.milestones).toHaveLength(2);
    expect(saveResponse.body.data.job.milestones[0].sequence).toBe(1);
  });

  it("rejects milestone plans whose totals do not match the funded budget", async () => {
    const company = request.agent(app);
    await registerCompany(company);

    const freelancer = request.agent(app);
    const freelancerUser = await registerFreelancer(freelancer);
    const jobId = await publishJob(company);

    await company.post(`/api/v1/jobs/${jobId}/assign`).send({
      freelancerId: freelancerUser.id
    });

    const intentResponse = await company.post(`/api/v1/jobs/${jobId}/escrow/intent`);

    await request(app).post("/api/v1/webhooks/payments/mock").send({
      eventId: "mock_evt_bad_total",
      intentId: intentResponse.body.data.intent.intentId,
      type: "payment.succeeded"
    });

    const invalidPlan = twoMilestonePlan();
    invalidPlan.milestones[1].amount = 1200;

    const response = await company.put(`/api/v1/jobs/${jobId}/milestones`).send(invalidPlan);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("MILESTONE_TOTAL_MISMATCH");
  });
});
