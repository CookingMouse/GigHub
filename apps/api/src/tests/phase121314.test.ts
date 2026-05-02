import { rm } from "fs/promises";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { hashPassword } from "../lib/hash";
import { getLocalStorageRoot } from "../services/file-storage-service";
import { app } from "../app";

type Agent = ReturnType<typeof request.agent>;

const clearData = async () => {
  await prisma.incomeStatementLineItem.deleteMany();
  await prisma.incomeStatement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
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

  if (sessionKeys.length > 0) {
    await redis.del(sessionKeys);
  }
};

const clearStorage = async () => {
  await rm(getLocalStorageRoot(), {
    recursive: true,
    force: true
  });
};

const registerCompany = async (agent: Agent, email = "company@example.com") => {
  await agent.post("/api/v1/auth/register").send({
    name: "Kampung Labs",
    email,
    password: "StrongPass123",
    role: "company"
  });

  return prisma.user.findUniqueOrThrow({
    where: {
      email
    }
  });
};

const registerFreelancer = async (agent: Agent, email = "aina@example.com") => {
  await agent.post("/api/v1/auth/register").send({
    name: "Aina Musa",
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

const createReleasedJob = async (freelancerId: string, companyId: string) => {
  const releasedAt = new Date("2026-04-20T12:00:00.000Z");
  const job = await prisma.job.create({
    data: {
      companyId,
      freelancerId,
      title: "Design campaign landing page",
      budget: "2400.00",
      milestoneCount: 1,
      status: "COMPLETED",
      publishedAt: new Date("2026-04-01T08:00:00.000Z"),
      assignedAt: new Date("2026-04-02T08:00:00.000Z"),
      brief: {
        create: {
          overview:
            "Design a campaign landing page with clear CTA structure and mobile-first sections.",
          deliverables: ["Figma landing page", "Handoff notes"],
          acceptanceCriteria: ["CTA hierarchy is complete"],
          glmBriefScore: 88,
          lastValidatedAt: new Date("2026-04-01T08:30:00.000Z")
        }
      },
      escrow: {
        create: {
          status: "FULLY_RELEASED",
          fundedAmount: "2400.00",
          releasedAmount: "2400.00",
          provider: "mock",
          providerReference: "mock_intent_income",
          fundedAt: new Date("2026-04-02T08:30:00.000Z"),
          releasedAt
        }
      },
      milestones: {
        create: {
          sequence: 1,
          title: "Design delivery",
          description: "Final design file and notes",
          amount: "2400.00",
          status: "RELEASED",
          submittedAt: new Date("2026-04-18T10:00:00.000Z"),
          releasedAt
        }
      }
    },
    include: {
      escrow: true,
      milestones: true
    }
  });

  await prisma.escrowRelease.create({
    data: {
      escrowId: job.escrow!.id,
      milestoneId: job.milestones[0].id,
      amount: "2400.00",
      trigger: "CLIENT_APPROVAL",
      releasedAt
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: companyId,
      entityType: "job",
      entityId: job.id,
      eventType: "job.completed",
      payload: {
        source: "phase121314-test"
      }
    }
  });

  return job;
};

const createOpenJob = async (companyId: string) =>
  prisma.job.create({
    data: {
      companyId,
      title: "Figma landing page design for SME campaign",
      budget: "1800.00",
      milestoneCount: 2,
      status: "OPEN",
      publishedAt: new Date("2026-04-21T08:00:00.000Z"),
      brief: {
        create: {
          overview:
            "We need a Figma designer to produce mobile-first layout and CTA sections.",
          requirements: ["Figma design", "Mobile layout"],
          deliverables: ["Design file", "Handoff notes"],
          glmBriefScore: 86,
          lastValidatedAt: new Date("2026-04-21T08:10:00.000Z")
        }
      }
    }
  });

describe("phase 12-14 routes", () => {
  beforeAll(async () => {
    await prisma.$connect();

    if (!redis.isOpen) {
      await redis.connect();
    }
  });

  beforeEach(async () => {
    await clearRedis();
    await clearStorage();
    await clearData();
  });

  afterAll(async () => {
    await clearRedis();
    await clearStorage();
    await clearData();

    if (redis.isOpen) {
      await redis.quit();
    }

    await prisma.$disconnect();
  });

  it("generates and verifies a freelancer income statement from released milestones", async () => {
    const freelancer = request.agent(app);
    const freelancerUser = await registerFreelancer(freelancer);
    const company = request.agent(app);
    const companyUser = await registerCompany(company);

    await createReleasedJob(freelancerUser.id, companyUser.id);

    const summaryResponse = await freelancer.get("/api/v1/freelancer/income");

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.data.summary.totalEarned).toBe(2400);
    expect(summaryResponse.body.data.summary.releasedMilestones).toBe(1);

    const generateResponse = await freelancer.post("/api/v1/freelancer/income/statements").send({
      periodStart: "2026-04-01T00:00:00.000Z",
      periodEnd: "2026-04-30T23:59:59.999Z"
    });

    expect(generateResponse.status).toBe(201);
    expect(generateResponse.body.data.statement.totalEarned).toBe(2400);
    expect(generateResponse.body.data.statement.lineItems).toHaveLength(1);
    expect(generateResponse.body.data.statement.pdfStorageKey).toMatch(/income-statements/);
    expect(generateResponse.body.data.statement.glmNarrative).toMatch(/released milestone/i);

    const verifyResponse = await request(app).get(
      `/api/v1/income-statements/verify/${generateResponse.body.data.statement.verifyToken}`
    );

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.statement.status).toBe("VERIFIED");
  });

  it("returns mock semantic job matches for open jobs", async () => {
    const freelancer = request.agent(app);
    const freelancerUser = await registerFreelancer(freelancer);
    const company = request.agent(app);
    const companyUser = await registerCompany(company);

    await prisma.freelancerProfile.update({
      where: {
        userId: freelancerUser.id
      },
      data: {
        portfolioUrl: "https://portfolio.example.com/aina",
        skills: ["Figma", "Landing page design", "Mobile layout"]
      }
    });
    const openJob = await createOpenJob(companyUser.id);

    const response = await freelancer.get("/api/v1/freelancer/job-matches");

    expect(response.status).toBe(200);
    expect(response.body.data.matches[0].jobId).toBe(openJob.id);
    expect(response.body.data.matches[0].matchScore).toBeGreaterThanOrEqual(60);
    expect(response.body.data.matches[0].reasons.join(" ")).toMatch(/skill match/i);
  });
});
