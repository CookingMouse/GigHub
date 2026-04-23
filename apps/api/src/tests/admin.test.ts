import request from "supertest";
import type { MilestonePlanInput, UpsertJobDraftInput } from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { hashPassword } from "../lib/hash";
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

const clearRedis = async () => {
  const sessionKeys = await redis.keys("session:*");
  const paymentEventKeys = await redis.keys("payment-event:*");
  const releaseKeys = await redis.keys("escrow-release:*");

  const keys = [...sessionKeys, ...paymentEventKeys, ...releaseKeys];

  if (keys.length > 0) {
    await redis.del(keys);
  }
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
    }
  });
};

const registerAdmin = async (agent: Agent, email = "admin@example.com") => {
  const password = "StrongPass123";

  await prisma.user.create({
    data: {
      email,
      name: "GigHub Admin",
      passwordHash: await hashPassword(password),
      role: "admin"
    }
  });

  await agent.post("/api/v1/auth/login").send({
    email,
    password
  });
};

const publishJob = async (company: Agent) => {
  const createResponse = await company.post("/api/v1/jobs").send(strongPayload());
  const jobId = createResponse.body.data.job.id as string;

  await company.post(`/api/v1/jobs/${jobId}/validate`);
  await company.post(`/api/v1/jobs/${jobId}/publish`);

  return jobId;
};

const prepareOpenDispute = async (rejectionReason: string) => {
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
    eventId: `mock_evt_admin_${crypto.randomUUID()}`,
    intentId: intentResponse.body.data.intent.intentId as string,
    type: "payment.succeeded"
  });

  await company.put(`/api/v1/jobs/${jobId}/milestones`).send(twoMilestonePlan());

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: {
      jobId,
      sequence: 1
    }
  });

  const submissionResponse = await freelancer
    .post(`/api/v1/freelancer/milestones/${milestone.id}/submissions`)
    .field("notes", "Admin dispute setup __force_pass")
    .attach("file", Buffer.from("GigHub admin dispute submission"), {
      filename: "delivery__force_pass.zip",
      contentType: "application/zip"
    });

  expect(submissionResponse.status).toBe(201);
  expect(submissionResponse.body.data.milestone.status).toBe("UNDER_REVIEW");

  const rejectResponse = await company.post(`/api/v1/jobs/${jobId}/milestones/${milestone.id}/reject`).send({
    rejectionReason
  });

  expect(rejectResponse.status).toBe(200);

  const dispute = await prisma.dispute.findFirstOrThrow({
    where: {
      submission: {
        milestoneId: milestone.id
      }
    }
  });

  return {
    company,
    freelancer,
    jobId,
    milestoneId: milestone.id,
    disputeId: dispute.id
  };
};

describe("admin dispute routes", () => {
  beforeAll(async () => {
    await prisma.$connect();

    if (!redis.isOpen) {
      await redis.connect();
    }
  });

  beforeEach(async () => {
    await clearRedis();
    await clearData();
  });

  afterAll(async () => {
    await clearRedis();
    await clearData();

    if (redis.isOpen) {
      await redis.quit();
    }

    await prisma.$disconnect();
  });

  it("lists open disputes and resolves one by releasing funds", async () => {
    const { disputeId, milestoneId } = await prepareOpenDispute(
      "Not good enough for approval. Please redo this."
    );
    const admin = request.agent(app);
    await registerAdmin(admin);

    const listResponse = await admin.get("/api/v1/admin/disputes");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.disputes).toHaveLength(1);
    expect(listResponse.body.data.disputes[0].id).toBe(disputeId);

    const detailResponse = await admin.get(`/api/v1/admin/disputes/${disputeId}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.dispute.disputeDecision.recommendation).toBe("release_funds");

    const resolveResponse = await admin.post(`/api/v1/admin/disputes/${disputeId}/resolve`).send({
      outcome: "release_funds",
      resolutionSummary: "Moderator found the rejection too weak compared to the milestone evidence.",
      adminNote: "Release the first milestone payment."
    });

    expect(resolveResponse.status).toBe(200);
    expect(resolveResponse.body.data.dispute.status).toBe("RESOLVED");
    expect(resolveResponse.body.data.dispute.resolutionType).toBe("release_funds");
    expect(resolveResponse.body.data.dispute.milestone.status).toBe("RELEASED");

    const release = await prisma.escrowRelease.findFirst({
      where: {
        milestoneId
      }
    });

    expect(release).not.toBeNull();
  });

  it("resolves an open dispute by routing the milestone back for revision", async () => {
    const { disputeId } = await prepareOpenDispute(
      "The footer is incomplete and the approved CTA block is missing from the final layout."
    );
    const admin = request.agent(app);
    await registerAdmin(admin, "admin2@example.com");

    const resolveResponse = await admin.post(`/api/v1/admin/disputes/${disputeId}/resolve`).send({
      outcome: "request_revision",
      resolutionSummary:
        "The rejection is specific and the missing CTA evidence justifies one more revision cycle.",
      adminNote: "Return the milestone to the freelancer."
    });

    expect(resolveResponse.status).toBe(200);
    expect(resolveResponse.body.data.dispute.status).toBe("RESOLVED");
    expect(resolveResponse.body.data.dispute.resolutionType).toBe("request_revision");
    expect(resolveResponse.body.data.dispute.milestone.status).toBe("REVISION_REQUESTED");

    const milestone = await prisma.milestone.findUniqueOrThrow({
      where: {
        id: resolveResponse.body.data.dispute.milestone.id as string
      }
    });

    expect(milestone.status).toBe("REVISION_REQUESTED");
  });
});
