import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@gighub.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";
const demoCompanyPassword = process.env.DEMO_COMPANY_PASSWORD ?? "Company123!";
const demoFreelancerPassword = process.env.DEMO_FREELANCER_PASSWORD ?? "Freelancer123!";
const demoIncomeVerifyToken = "demo-income-statement-aina-2026-04";

const demoJobTitles = [
  "Demo Open Job - Figma landing page design",
  "Demo Active Job - SME campaign microsite",
  "Demo Disputed Job - Product launch assets",
  "Demo Completed Job - Loan explainer design"
];

const upsertAdmin = async () => {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  return prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: "GigHub Admin",
      passwordHash,
      role: "admin"
    },
    create: {
      email: adminEmail.toLowerCase(),
      name: "GigHub Admin",
      passwordHash,
      role: "admin"
    }
  });
};

const upsertDemoCompany = async () => {
  const passwordHash = await bcrypt.hash(demoCompanyPassword, 12);

  return prisma.user.upsert({
    where: {
      email: "company@gighub.demo"
    },
    update: {
      name: "Kampung Labs",
      passwordHash,
      role: "company",
      companyProfile: {
        upsert: {
          update: {
            companyName: "Kampung Labs"
          },
          create: {
            companyName: "Kampung Labs"
          }
        }
      }
    },
    create: {
      email: "company@gighub.demo",
      name: "Kampung Labs",
      passwordHash,
      role: "company",
      companyProfile: {
        create: {
          companyName: "Kampung Labs"
        }
      }
    }
  });
};

const upsertDemoFreelancers = async () => {
  const freelancerPasswordHash = await bcrypt.hash(demoFreelancerPassword, 12);
  const demoFreelancers = [
    {
      email: "aina@example.com",
      name: "Aina Musa",
      profile: {
        displayName: "Aina Musa",
        portfolioUrl: "https://portfolio.example.com/aina",
        skills: ["UI Design", "Figma", "Brand Systems", "Landing Pages"],
        hourlyRate: "120.00",
        ratingAverage: "4.80"
      }
    },
    {
      email: "hakim@example.com",
      name: "Hakim Salleh",
      profile: {
        displayName: "Hakim Salleh",
        portfolioUrl: "https://portfolio.example.com/hakim",
        skills: ["Frontend Development", "Next.js", "TypeScript"],
        hourlyRate: "150.00",
        ratingAverage: "4.90"
      }
    },
    {
      email: "sofia@example.com",
      name: "Sofia Karim",
      profile: {
        displayName: "Sofia Karim",
        portfolioUrl: "https://portfolio.example.com/sofia",
        skills: ["Copywriting", "Content Strategy", "Campaign Messaging"],
        hourlyRate: "95.00",
        ratingAverage: "4.70"
      }
    }
  ];
  const users = [];

  for (const freelancer of demoFreelancers) {
    users.push(
      await prisma.user.upsert({
        where: {
          email: freelancer.email
        },
        update: {
          name: freelancer.name,
          passwordHash: freelancerPasswordHash,
          role: "freelancer",
          freelancerProfile: {
            upsert: {
              update: {
                displayName: freelancer.profile.displayName,
                portfolioUrl: freelancer.profile.portfolioUrl,
                skills: freelancer.profile.skills,
                hourlyRate: freelancer.profile.hourlyRate,
                ratingAverage: freelancer.profile.ratingAverage
              },
              create: {
                displayName: freelancer.profile.displayName,
                portfolioUrl: freelancer.profile.portfolioUrl,
                skills: freelancer.profile.skills,
                hourlyRate: freelancer.profile.hourlyRate,
                ratingAverage: freelancer.profile.ratingAverage
              }
            }
          }
        },
        create: {
          email: freelancer.email,
          name: freelancer.name,
          passwordHash: freelancerPasswordHash,
          role: "freelancer",
          freelancerProfile: {
            create: {
              displayName: freelancer.profile.displayName,
              portfolioUrl: freelancer.profile.portfolioUrl,
              skills: freelancer.profile.skills,
              hourlyRate: freelancer.profile.hourlyRate,
              ratingAverage: freelancer.profile.ratingAverage
            }
          }
        }
      })
    );
  }

  return users;
};

const resetDemoScenario = async (companyId: string) => {
  await prisma.incomeStatement.deleteMany({
    where: {
      verifyToken: demoIncomeVerifyToken
    }
  });
  await prisma.job.deleteMany({
    where: {
      companyId,
      title: {
        in: demoJobTitles
      }
    }
  });
};

const createDemoOpenJob = async (companyId: string) =>
  prisma.job.create({
    data: {
      companyId,
      title: "Demo Open Job - Figma landing page design",
      budget: "1800.00",
      milestoneCount: 2,
      status: "OPEN",
      publishedAt: new Date("2026-04-21T08:00:00.000Z"),
      brief: {
        create: {
          overview:
            "Create a Figma landing page for an SME financing campaign with mobile-first structure, lead capture, and clear CTA hierarchy.",
          scope: ["Design responsive landing page sections", "Prepare content and CTA hierarchy"],
          deliverables: ["Final Figma file", "Developer handoff notes"],
          requirements: ["Figma", "Mobile layout", "Landing page design"],
          acceptanceCriteria: ["CTA hierarchy is clear", "Design is ready for developer handoff"],
          timeline: {
            startDate: "2026-04-25",
            endDate: "2026-05-05",
            notes: "First review within three working days."
          },
          briefData: {
            source: "demo-seed"
          },
          glmBriefScore: 88,
          glmValidationSummary: "Demo mock GLM found the brief specific and publishable.",
          glmGaps: [],
          glmClarifyingQuestions: [],
          lastValidatedAt: new Date("2026-04-21T08:10:00.000Z")
        }
      }
    }
  });

const createDemoActiveJob = async (companyId: string, freelancerId: string) =>
  prisma.job.create({
    data: {
      companyId,
      freelancerId,
      title: "Demo Active Job - SME campaign microsite",
      budget: "3200.00",
      milestoneCount: 2,
      status: "IN_PROGRESS",
      publishedAt: new Date("2026-04-10T09:00:00.000Z"),
      assignedAt: new Date("2026-04-11T09:00:00.000Z"),
      brief: {
        create: {
          overview:
            "Design and prepare a microsite concept for a Malaysian SME loan campaign with clear lead capture flow.",
          scope: ["Homepage direction", "Lead capture section", "Mobile responsive hierarchy"],
          deliverables: ["Design direction", "Final handoff package"],
          requirements: ["Figma", "Brand system consistency"],
          acceptanceCriteria: ["All campaign sections are present", "Lead capture CTA is visible"],
          timeline: {
            startDate: "2026-04-12",
            endDate: "2026-05-03",
            notes: "Use the milestone schedule in the escrow workflow."
          },
          briefData: {
            source: "demo-seed"
          },
          glmBriefScore: 86,
          glmValidationSummary: "Demo mock GLM confirmed enough structure for escrow work.",
          glmGaps: [],
          glmClarifyingQuestions: [],
          lastValidatedAt: new Date("2026-04-10T09:10:00.000Z")
        }
      },
      escrow: {
        create: {
          status: "FUNDED",
          fundedAmount: "3200.00",
          releasedAmount: "0.00",
          provider: "mock",
          providerReference: "mock_demo_active_escrow",
          fundedAt: new Date("2026-04-11T10:00:00.000Z")
        }
      },
      milestones: {
        create: [
          {
            sequence: 1,
            title: "Design direction and content structure",
            description: "Initial design pass and content hierarchy for review.",
            amount: "1600.00",
            status: "PENDING",
            dueAt: new Date("2026-05-02T00:00:00.000Z")
          },
          {
            sequence: 2,
            title: "Final delivery and handoff",
            description: "Approved design file and implementation notes.",
            amount: "1600.00",
            status: "PENDING",
            dueAt: new Date("2026-05-09T00:00:00.000Z")
          }
        ]
      }
    }
  });

const createDemoDisputeJob = async (companyId: string, freelancerId: string) => {
  const job = await prisma.job.create({
    data: {
      companyId,
      freelancerId,
      title: "Demo Disputed Job - Product launch assets",
      budget: "1400.00",
      milestoneCount: 1,
      status: "DISPUTED",
      publishedAt: new Date("2026-04-03T09:00:00.000Z"),
      assignedAt: new Date("2026-04-04T09:00:00.000Z"),
      brief: {
        create: {
          overview:
            "Prepare visual launch assets and a concise handoff pack for a new SME product page.",
          deliverables: ["Launch asset pack", "Handoff notes"],
          acceptanceCriteria: ["Assets follow brand style", "All requested sizes are included"],
          briefData: {
            source: "demo-seed"
          },
          glmBriefScore: 82,
          glmValidationSummary: "Demo mock GLM confirmed the launch asset brief is reviewable.",
          glmGaps: [],
          glmClarifyingQuestions: [],
          lastValidatedAt: new Date("2026-04-03T09:10:00.000Z")
        }
      },
      escrow: {
        create: {
          status: "FUNDED",
          fundedAmount: "1400.00",
          releasedAmount: "0.00",
          provider: "mock",
          providerReference: "mock_demo_dispute_escrow",
          fundedAt: new Date("2026-04-04T10:00:00.000Z")
        }
      },
      milestones: {
        create: {
          sequence: 1,
          title: "Launch asset delivery",
          description: "Final launch images and notes.",
          amount: "1400.00",
          status: "DISPUTED",
          dueAt: new Date("2026-04-18T00:00:00.000Z"),
          submittedAt: new Date("2026-04-17T10:00:00.000Z")
        }
      }
    },
    include: {
      milestones: true
    }
  });
  const milestone = job.milestones[0];
  const submission = await prisma.submission.create({
    data: {
      milestoneId: milestone.id,
      revision: 1,
      status: "DISPUTED",
      notes: "Demo submission for moderation review.",
      reviewDecision: "COMPANY_REJECTED",
      rejectionReason: "The client says the sizes are not aligned with the asset brief.",
      fileName: "launch-assets.zip",
      fileFormat: "zip",
      fileSizeBytes: 482000,
      fileHash: "demo".padEnd(64, "0"),
      submittedAt: new Date("2026-04-17T10:00:00.000Z"),
      reviewedAt: new Date("2026-04-17T12:00:00.000Z"),
      activityLog: [
        {
          type: "demo.submission.created",
          occurredAt: "2026-04-17T10:00:00.000Z"
        }
      ]
    }
  });

  await prisma.gLMDecision.create({
    data: {
      jobId: job.id,
      submissionId: submission.id,
      decisionType: "MILESTONE_SCORING",
      overallScore: 84,
      passFail: "pass",
      requirementScores: [
        {
          requirement: "brief_coverage",
          score: 88
        }
      ],
      reasoning: "Demo mock GLM found the launch asset submission credible for company review.",
      rawResponse: {
        source: "demo-seed"
      }
    }
  });

  const dispute = await prisma.dispute.create({
    data: {
      submissionId: submission.id,
      raisedById: companyId,
      status: "OPEN",
      rejectionReason: "The client says the sizes are not aligned with the asset brief."
    }
  });

  await prisma.gLMDecision.create({
    data: {
      jobId: job.id,
      disputeId: dispute.id,
      decisionType: "DISPUTE_ANALYSIS",
      recommendation: "release_funds",
      badFaithFlags: ["vague_rejection_reason"],
      reasoning:
        "Demo mock GLM found the rejection less specific than the delivery evidence and recommends moderator review for release.",
      rawResponse: {
        source: "demo-seed"
      }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: freelancerId,
        entityType: "milestone",
        entityId: milestone.id,
        eventType: "submission.created",
        payload: {
          demo: true
        }
      },
      {
        actorId: companyId,
        entityType: "dispute",
        entityId: dispute.id,
        eventType: "dispute.created",
        payload: {
          demo: true
        }
      }
    ]
  });

  return job;
};

const createDemoCompletedJob = async (companyId: string, freelancerId: string) => {
  const releasedAt = new Date("2026-04-20T12:00:00.000Z");
  const job = await prisma.job.create({
    data: {
      companyId,
      freelancerId,
      title: "Demo Completed Job - Loan explainer design",
      budget: "2400.00",
      milestoneCount: 1,
      status: "COMPLETED",
      publishedAt: new Date("2026-04-01T08:00:00.000Z"),
      assignedAt: new Date("2026-04-02T08:00:00.000Z"),
      brief: {
        create: {
          overview:
            "Design a loan explainer page with a clean mobile layout and clear conversion path.",
          deliverables: ["Final Figma page", "Handoff notes"],
          acceptanceCriteria: ["CTA hierarchy is clear", "Mobile readability is strong"],
          briefData: {
            source: "demo-seed"
          },
          glmBriefScore: 90,
          glmValidationSummary: "Demo mock GLM found the brief complete.",
          glmGaps: [],
          glmClarifyingQuestions: [],
          lastValidatedAt: new Date("2026-04-01T08:15:00.000Z")
        }
      },
      escrow: {
        create: {
          status: "FULLY_RELEASED",
          fundedAmount: "2400.00",
          releasedAmount: "2400.00",
          provider: "mock",
          providerReference: "mock_demo_completed_escrow",
          fundedAt: new Date("2026-04-02T08:30:00.000Z"),
          releasedAt
        }
      },
      milestones: {
        create: {
          sequence: 1,
          title: "Final explainer design",
          description: "Released design milestone used for income statement demo.",
          amount: "2400.00",
          status: "RELEASED",
          dueAt: new Date("2026-04-19T00:00:00.000Z"),
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

  await prisma.incomeStatement.create({
    data: {
      freelancerId,
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-30T23:59:59.999Z"),
      totalEarned: "2400.00",
      totalJobs: 1,
      totalMilestones: 1,
      avgMonthlyIncome: "2400.00",
      currency: "MYR",
      pdfStorageKey: "income-statements/demo/aina-april-2026.pdf",
      verifyToken: demoIncomeVerifyToken,
      glmNarrative:
        "Demo mock GLM summary: Aina Musa earned RM2,400.00 from one released escrow milestone in April 2026.",
      status: "GENERATED",
      lineItems: {
        create: {
          milestoneId: job.milestones[0].id,
          jobTitle: job.title,
          companyName: "Kampung Labs",
          amount: "2400.00",
          releasedAt,
          category: "Design"
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: companyId,
      entityType: "job",
      entityId: job.id,
      eventType: "job.completed",
      payload: {
        demo: true
      }
    }
  });

  return job;
};

const main = async () => {
  await upsertAdmin();
  const company = await upsertDemoCompany();
  const [aina] = await upsertDemoFreelancers();

  await resetDemoScenario(company.id);
  await createDemoOpenJob(company.id);
  await createDemoActiveJob(company.id, aina.id);
  await createDemoDisputeJob(company.id, aina.id);
  await createDemoCompletedJob(company.id, aina.id);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
