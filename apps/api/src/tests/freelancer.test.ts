import { rm } from "fs/promises";
import JSZip from "jszip";
import request from "supertest";
import sharp from "sharp";
import type { MilestonePlanInput, UpsertJobDraftInput } from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { getLocalStorageRoot } from "../services/file-storage-service";
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
  const paymentEventKeys = await redis.keys("payment-event:*");

  if (sessionKeys.length > 0) {
    await redis.del(sessionKeys);
  }

  if (paymentEventKeys.length > 0) {
    await redis.del(paymentEventKeys);
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
};

const registerFreelancer = async (
  agent: Agent,
  overrides: {
    email?: string;
    name?: string;
  } = {}
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

const publishJob = async (company: Agent, payload: UpsertJobDraftInput = strongPayload()) => {
  const createResponse = await company.post("/api/v1/jobs").send(payload);
  const jobId = createResponse.body.data.job.id as string;

  await company.post(`/api/v1/jobs/${jobId}/validate`);
  await company.post(`/api/v1/jobs/${jobId}/publish`);

  return jobId;
};

const prepareInProgressMilestone = async () => {
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
    eventId: `mock_evt_submission_${crypto.randomUUID()}`,
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

  return {
    company,
    freelancer,
    freelancerUser,
    jobId,
    milestoneId: milestone.id
  };
};

const escapePdfText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const createPdfBuffer = (text: string) => {
  const content = `BT /F1 18 Tf 50 100 Td (${escapePdfText(text)}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];

  let document = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document, "utf8"));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(document, "utf8");
  document += `xref\n0 ${objects.length + 1}\n`;
  document += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    document += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });

  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(document, "utf8");
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const createDocxBuffer = async (text: string) => {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${escapeXml(text)}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`
  );

  return zip.generateAsync({
    type: "nodebuffer"
  });
};

const createZipBuffer = async () => {
  const zip = new JSZip();
  zip.file("handoff.txt", "GigHub test zip content");

  return zip.generateAsync({
    type: "nodebuffer"
  });
};

const createPngBuffer = () =>
  sharp({
    create: {
      width: 240,
      height: 120,
      channels: 3,
      background: {
        r: 11,
        g: 110,
        b: 79
      }
    }
  })
    .png()
    .toBuffer();

const createJpgBuffer = () =>
  sharp({
    create: {
      width: 300,
      height: 160,
      channels: 3,
      background: {
        r: 247,
        g: 199,
        b: 103
      }
    }
  })
    .jpeg()
    .toBuffer();

describe("freelancer routes", () => {
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

  it("lists assigned jobs for the authenticated freelancer", async () => {
    const { freelancer } = await prepareInProgressMilestone();

    const response = await freelancer.get("/api/v1/freelancer/jobs");

    expect(response.status).toBe(200);
    expect(response.body.data.jobs).toHaveLength(1);
    expect(response.body.data.jobs[0].milestones).toHaveLength(2);
    expect(response.body.data.jobs[0].milestones[0].remainingRevisions).toBe(3);
  });

  it("returns milestone detail for the assigned freelancer", async () => {
    const { freelancer, milestoneId } = await prepareInProgressMilestone();

    const response = await freelancer.get(`/api/v1/freelancer/milestones/${milestoneId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.milestone.id).toBe(milestoneId);
    expect(response.body.data.milestone.brief.deliverables).toHaveLength(2);
    expect(response.body.data.milestone.remainingRevisions).toBe(3);
  });

  it.each([
    {
      label: "pdf",
      fileName: "delivery.pdf",
      mimeType: "application/pdf",
      createBuffer: async () => createPdfBuffer("GigHub PDF submission content"),
      assertMetadata: (submission: Record<string, unknown>) => {
        expect(submission.fileFormat).toBe("pdf");
        expect(Number(submission.wordCount)).toBeGreaterThan(0);
      }
    },
    {
      label: "docx",
      fileName: "delivery.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      createBuffer: async () => createDocxBuffer("GigHub DOCX submission content"),
      assertMetadata: (submission: Record<string, unknown>) => {
        expect(submission.fileFormat).toBe("docx");
        expect(Number(submission.wordCount)).toBeGreaterThan(0);
      }
    },
    {
      label: "png",
      fileName: "delivery.png",
      mimeType: "image/png",
      createBuffer: async () => createPngBuffer(),
      assertMetadata: (submission: Record<string, unknown>) => {
        expect(submission.fileFormat).toBe("png");
        expect(submission.dimensions).toBe("240x120");
      }
    },
    {
      label: "jpg",
      fileName: "delivery.jpg",
      mimeType: "image/jpeg",
      createBuffer: async () => createJpgBuffer(),
      assertMetadata: (submission: Record<string, unknown>) => {
        expect(submission.fileFormat).toBe("jpg");
        expect(submission.dimensions).toBe("300x160");
      }
    },
    {
      label: "zip",
      fileName: "delivery.zip",
      mimeType: "application/zip",
      createBuffer: async () => createZipBuffer(),
      assertMetadata: (submission: Record<string, unknown>) => {
        expect(submission.fileFormat).toBe("zip");
        expect(submission.wordCount).toBeNull();
      }
    }
  ])(
    "accepts $label submissions, stores metadata, and routes pass results into company review",
    async ({ fileName, mimeType, createBuffer, assertMetadata }) => {
      const { freelancer, milestoneId } = await prepareInProgressMilestone();
      const fileBuffer = await createBuffer();

      const response = await freelancer
        .post(`/api/v1/freelancer/milestones/${milestoneId}/submissions`)
        .field("notes", `GigHub ${fileName} submission __force_pass`)
        .attach("file", fileBuffer, {
          filename: fileName,
          contentType: mimeType
        });

      expect(response.status).toBe(201);
      expect(response.body.data.milestone.status).toBe("UNDER_REVIEW");
      expect(response.body.data.milestone.reviewDueAt).toBeTruthy();
      expect(response.body.data.milestone.latestDecision.passFail).toBe("pass");
      expect(response.body.data.milestone.submissionHistory).toHaveLength(1);

      const submission = await prisma.submission.findFirstOrThrow({
        where: {
          milestoneId
        }
      });

      expect(submission.fileName).toBe(fileName);
      expect(submission.fileHash).toHaveLength(64);
      expect(submission.notes).toMatch(/GigHub/);
      expect(submission.reviewDecision).toBe("GLM_PASS");
      assertMetadata(submission as unknown as Record<string, unknown>);
    }
  );

  it.each([
    {
      label: "partial",
      forcedToken: "__force_partial",
      expectedDecision: "GLM_PARTIAL"
    },
    {
      label: "fail",
      forcedToken: "__force_fail",
      expectedDecision: "GLM_FAIL"
    }
  ])("routes $label milestone scoring results into revision requested", async ({ forcedToken, expectedDecision }) => {
    const { freelancer, milestoneId } = await prepareInProgressMilestone();

    const response = await freelancer
      .post(`/api/v1/freelancer/milestones/${milestoneId}/submissions`)
      .field("notes", `GigHub revision ${forcedToken}`)
      .attach("file", await createZipBuffer(), {
        filename: `revision-${forcedToken}.zip`,
        contentType: "application/zip"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.milestone.status).toBe("REVISION_REQUESTED");
    expect(response.body.data.milestone.latestDecision.passFail).toBe(
      forcedToken === "__force_partial" ? "partial" : "fail"
    );

    const submission = await prisma.submission.findFirstOrThrow({
      where: {
        milestoneId
      }
    });

    expect(submission.status).toBe("REJECTED");
    expect(submission.reviewDecision).toBe(expectedDecision);
  });

  it("rejects the fourth revision for the same milestone", async () => {
    const { freelancer, milestoneId } = await prepareInProgressMilestone();

    for (let revision = 1; revision <= 3; revision += 1) {
      const response = await freelancer
        .post(`/api/v1/freelancer/milestones/${milestoneId}/submissions`)
        .field("notes", `Revision ${revision} __force_fail`)
        .attach("file", await createZipBuffer(), {
          filename: `revision-${revision}.zip`,
          contentType: "application/zip"
        });

      expect(response.status).toBe(201);
    }

    const blockedResponse = await freelancer
      .post(`/api/v1/freelancer/milestones/${milestoneId}/submissions`)
      .field("notes", "Revision 4")
      .attach("file", await createZipBuffer(), {
        filename: "revision-4.zip",
        contentType: "application/zip"
      });

    expect(blockedResponse.status).toBe(409);
    expect(blockedResponse.body.code).toBe("SUBMISSION_REVISION_LIMIT_REACHED");
  });

  it("blocks another freelancer from reading a milestone they do not own", async () => {
    const { milestoneId } = await prepareInProgressMilestone();
    const outsider = request.agent(app);
    await registerFreelancer(outsider, {
      email: "outsider@example.com",
      name: "Outsider Freelancer"
    });

    const response = await outsider.get(`/api/v1/freelancer/milestones/${milestoneId}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("MILESTONE_NOT_FOUND");
  });
});
