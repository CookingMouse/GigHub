import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const prismaAny = prisma as any;
const mockCompanyCount = 200;
const mockFreelancerCount = 200;
const mockEmailDomain = "gighub.mock";

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
const demoInvitationNote =
  "We reviewed your profile and would like to invite you to this Kampung Labs project.";
const demoInvitationThreadSubject = "Kampung Labs invitation for Demo Open Job - Figma landing page design";

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
      description: "We need a professional Figma landing page design for our SME financing campaign. This includes a responsive mobile-first layout with clear CTA hierarchy, lead capture form, and developer handoff notes. Design should align with our modern fintech aesthetic and be ready for developer implementation within three working days.",
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
      description: "Build a complete microsite for our Malaysian SME financing campaign. The site should feature a compelling homepage, clear lead capture flow, and mobile-responsive design. We're looking for both design direction and a finished handoff package ready for developer implementation. Must maintain consistency with our brand system throughout all sections.",
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
      description: "Create visual launch assets for our new SME product page including multiple format variations. Deliverables include a complete asset pack, social media graphics, web banners, and detailed handoff notes for our development team. All assets must follow our established brand style guide and include requested image sizes and specifications.",
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

  const dispute = await prisma.dispute.create({
    data: {
      submissionId: submission.id,
      raisedById: companyId,
      status: "OPEN",
      rejectionReason: "The client says the sizes are not aligned with the asset brief."
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
      description: "Design a comprehensive loan explainer page with a clean mobile-first layout and clear conversion path. The page needed to explain our loan product features, benefits, and eligibility criteria in an engaging visual format. Includes clear CTA hierarchy and strong mobile readability to guide users toward the application process.",
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

const ensureDemoInvitationForAina = async (
  company: { id: string; name: string; email: string },
  aina: { id: string; name: string; email: string },
  job: { id: string; title: string }
) => {
  await prismaAny.jobInvitation.deleteMany({
    where: {
      companyId: company.id,
      freelancerId: aina.id,
      jobId: job.id
    }
  });

  const invitation = await prismaAny.jobInvitation.create({
    data: {
      jobId: job.id,
      companyId: company.id,
      freelancerId: aina.id,
      note: demoInvitationNote,
      status: "PENDING"
    }
  });

  await prisma.notification.deleteMany({
    where: {
      recipientId: {
        in: [company.id, aina.id]
      },
      OR: [
        {
          title: "New job invitation from Kampung Labs"
        },
        {
          title: "Invitation sent to Aina Musa"
        }
      ]
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        recipientId: aina.id,
        type: "job.invitation.created",
        title: "New job invitation from Kampung Labs",
        message: `Kampung Labs invited you to join "${job.title}".`,
        payload: {
          invitationId: invitation.id,
          jobId: job.id,
          companyId: company.id
        },
        deliveryStatus: "SENT",
        sentAt: new Date()
      },
      {
        recipientId: company.id,
        type: "job.invitation.created",
        title: "Invitation sent to Aina Musa",
        message: `Your invitation for "${job.title}" is waiting for Aina Musa's response.`,
        payload: {
          invitationId: invitation.id,
          jobId: job.id,
          freelancerId: aina.id
        },
        deliveryStatus: "SENT",
        sentAt: new Date()
      }
    ]
  });

  await prismaAny.conversationMessage.deleteMany({
    where: {
      thread: {
        subject: demoInvitationThreadSubject
      }
    }
  });
  await prismaAny.conversationParticipant.deleteMany({
    where: {
      thread: {
        subject: demoInvitationThreadSubject
      }
    }
  });
  await prismaAny.conversationThread.deleteMany({
    where: {
      subject: demoInvitationThreadSubject
    }
  });

  const thread = await prismaAny.conversationThread.create({
    data: {
      jobId: job.id,
      createdById: company.id,
      subject: demoInvitationThreadSubject,
      participants: {
        create: [
          {
            userId: company.id
          },
          {
            userId: aina.id
          }
        ]
      }
    }
  });

  await prismaAny.conversationMessage.create({
    data: {
      threadId: thread.id,
      senderId: company.id,
      body: "Hello Aina, we would like to invite you to review this job and let us know if you are available."
    }
  });
};

const upsertBulkCompanies = async () => {
  const passwordHash = await bcrypt.hash(demoCompanyPassword, 12);
  const companies: Array<{ id: string; email: string; name: string }> = [];

  for (let index = 1; index <= mockCompanyCount; index += 1) {
    const email = `company${index}@${mockEmailDomain}`;
    const name = `Mock Company ${index}`;
    const company = await prismaAny.user.upsert({
      where: {
        email
      },
      update: {
        name,
        passwordHash,
        role: "company",
        companyProfile: {
          upsert: {
            update: {
              companyName: name,
              website: `https://company${index}.example.com`,
              industry: index % 2 === 0 ? "SaaS" : "E-Commerce",
              about: `Mock company ${index} generated for load and UI testing.`
            },
            create: {
              companyName: name,
              website: `https://company${index}.example.com`,
              industry: index % 2 === 0 ? "SaaS" : "E-Commerce",
              about: `Mock company ${index} generated for load and UI testing.`
            }
          }
        }
      },
      create: {
        email,
        name,
        passwordHash,
        role: "company",
        companyProfile: {
          create: {
            companyName: name,
            website: `https://company${index}.example.com`,
            industry: index % 2 === 0 ? "SaaS" : "E-Commerce",
            about: `Mock company ${index} generated for load and UI testing.`
          }
        }
      }
    });

    companies.push({
      id: company.id,
      email: company.email,
      name
    });
  }

  return companies;
};

const upsertBulkFreelancers = async () => {
  const passwordHash = await bcrypt.hash(demoFreelancerPassword, 12);
  const freelancers: Array<{ id: string; email: string; name: string }> = [];

  for (let index = 1; index <= mockFreelancerCount; index += 1) {
    const email = `freelancer${index}@${mockEmailDomain}`;
    const name = `Mock Freelancer ${index}`;
    const freelancer = await prismaAny.user.upsert({
      where: {
        email
      },
      update: {
        name,
        passwordHash,
        role: "freelancer",
        freelancerProfile: {
          upsert: {
            update: {
              displayName: name,
              portfolioUrl: `https://portfolio.example.com/mock-${index}`,
              skills: index % 2 === 0 ? ["Figma", "UI Design"] : ["Next.js", "TypeScript"],
              headline: "Mock profile for testing",
              bio: "Generated profile used for request and inbox testing.",
              experienceYears: (index % 8) + 1,
              pastProjects: [`Project ${index}A`, `Project ${index}B`]
            },
            create: {
              displayName: name,
              portfolioUrl: `https://portfolio.example.com/mock-${index}`,
              skills: index % 2 === 0 ? ["Figma", "UI Design"] : ["Next.js", "TypeScript"],
              headline: "Mock profile for testing",
              bio: "Generated profile used for request and inbox testing.",
              experienceYears: (index % 8) + 1,
              pastProjects: [`Project ${index}A`, `Project ${index}B`]
            }
          }
        }
      },
      create: {
        email,
        name,
        passwordHash,
        role: "freelancer",
        freelancerProfile: {
          create: {
            displayName: name,
            portfolioUrl: `https://portfolio.example.com/mock-${index}`,
            skills: index % 2 === 0 ? ["Figma", "UI Design"] : ["Next.js", "TypeScript"],
            headline: "Mock profile for testing",
            bio: "Generated profile used for request and inbox testing.",
            experienceYears: (index % 8) + 1,
            pastProjects: [`Project ${index}A`, `Project ${index}B`]
          }
        }
      }
    });

    freelancers.push({
      id: freelancer.id,
      email: freelancer.email,
      name
    });
  }

  return freelancers;
};

const buildOrUpdateMockOpenJobs = async (companies: Array<{ id: string; name: string }>) => {
  const jobs = [];

  for (let index = 0; index < companies.length; index += 1) {
    const company = companies[index];
    const title = `Scale Mock Job ${index + 1} - Landing Page and Copy`;
    const existing = await prisma.job.findFirst({
      where: {
        companyId: company.id,
        title
      }
    });

    const publishedAt = new Date(Date.now() - index * 60 * 60 * 1000);
    const jobDescription = `We need a professional landing page design with compelling copy for our ${["marketing", "product launch", "SME campaign", "fintech", "e-commerce"][index % 5]} initiative. This includes responsive mobile-first layout, clear CTA hierarchy, lead capture form, and developer handoff notes. Design should align with our brand aesthetic and be ready for implementation.`;
    const job =
      existing !== null
        ? await prisma.job.update({
            where: {
              id: existing.id
            },
            data: {
              status: "OPEN",
              freelancerId: null,
              assignedAt: null,
              title,
              description: jobDescription,
              budget: "2500.00",
              milestoneCount: 2,
              publishedAt
            }
          })
        : await prisma.job.create({
            data: {
              companyId: company.id,
              title,
              description: jobDescription,
              budget: "2500.00",
              milestoneCount: 2,
              status: "OPEN",
              publishedAt,
              brief: {
                create: {
                  overview: "Mock open job used for freelancer recommendation and job request load testing.",
                  deliverables: ["Landing page draft", "CTA copy"],
                  acceptanceCriteria: ["Deliverables complete", "Meets style guide"],
                  glmBriefScore: 88,
                  glmValidationSummary: "Mock validated brief for seed.",
                  lastValidatedAt: publishedAt
                }
              }
            }
          });

    jobs.push(job);
  }

  return jobs;
};

const seedBulkRequestsAndInbox = async (
  companies: Array<{ id: string; name: string }>,
  freelancers: Array<{ id: string; name: string }>,
  openJobs: Array<{ id: string; companyId: string }>
) => {
  await prisma.job.deleteMany({
    where: {
      title: {
        startsWith: "Scale Active Job "
      }
    }
  });

  await prismaAny.conversationMessage.deleteMany({
    where: {
      thread: {
        subject: {
          startsWith: "Mock conversation "
        }
      }
    }
  });

  await prismaAny.conversationParticipant.deleteMany({
    where: {
      thread: {
        subject: {
          startsWith: "Mock conversation "
        }
      }
    }
  });

  await prismaAny.conversationThread.deleteMany({
    where: {
      subject: {
        startsWith: "Mock conversation "
      }
    }
  });

  await prisma.jobApplication.deleteMany({
    where: {
      OR: [
        {
          freelancer: {
            email: {
              endsWith: `@${mockEmailDomain}`
            }
          }
        },
        {
          job: {
            title: {
              startsWith: "Scale Mock Job "
            }
          }
        }
      ]
    }
  });

  await prismaAny.jobInvitation.deleteMany({
    where: {
      OR: [
        {
          companyId: {
            in: companies.map((company) => company.id)
          }
        },
        {
          freelancerId: {
            in: freelancers.map((freelancer) => freelancer.id)
          }
        }
      ]
    }
  });

  await prisma.notification.deleteMany({
    where: {
      recipientId: {
        in: [...companies.map((company) => company.id), ...freelancers.map((freelancer) => freelancer.id)]
      }
    }
  });

  for (let index = 0; index < freelancers.length; index += 1) {
    const freelancer = freelancers[index];
    const appliedJob = openJobs[index % openJobs.length];
    const invitedJob = openJobs[(index + 3) % openJobs.length];

    await prisma.jobApplication.upsert({
      where: {
        jobId_freelancerId: {
          jobId: appliedJob.id,
          freelancerId: freelancer.id
        }
      },
      create: {
        jobId: appliedJob.id,
        freelancerId: freelancer.id,
        status: "PENDING",
        coverNote: `Mock application from ${freelancer.name}`
      },
      update: {
        status: "PENDING",
        coverNote: `Mock application from ${freelancer.name}`
      }
    });

    await prismaAny.jobInvitation.create({
      data: {
        jobId: invitedJob.id,
        companyId: invitedJob.companyId,
        freelancerId: freelancer.id,
        note: `Mock invitation for ${freelancer.name}`,
        status: "PENDING"
      }
    });

    const dueSoonJob = await prisma.job.create({
      data: {
        companyId: companies[index % companies.length].id,
        freelancerId: freelancer.id,
        title: `Scale Active Job ${index + 1} - Delivery Task`,
        budget: "1200.00",
        milestoneCount: 1,
        status: "IN_PROGRESS",
        publishedAt: new Date(),
        assignedAt: new Date(),
        brief: {
          create: {
            overview: "Mock active job with upcoming due date.",
            deliverables: ["Delivery file"],
            acceptanceCriteria: ["Matches scope"],
            glmBriefScore: 85,
            glmValidationSummary: "Mock active job brief",
            lastValidatedAt: new Date()
          }
        },
        milestones: {
          create: {
            sequence: 1,
            title: "Mock delivery milestone",
            description: "Used for due-date notifications.",
            amount: "1200.00",
            status: "IN_PROGRESS",
            dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
          }
        }
      }
    });

    const thread = await prismaAny.conversationThread.create({
      data: {
        jobId: invitedJob.id,
        createdById: invitedJob.companyId,
        subject: `Mock conversation ${index + 1}`,
        participants: {
          create: [
            {
              userId: invitedJob.companyId
            },
            {
              userId: freelancer.id
            }
          ]
        }
      }
    });

    await prismaAny.conversationMessage.createMany({
      data: [
        {
          threadId: thread.id,
          senderId: invitedJob.companyId,
          body: `Hi ${freelancer.name}, please confirm the job requirements.`
        },
        {
          threadId: thread.id,
          senderId: freelancer.id,
          body: "Confirmed. I will update progress before the due date."
        }
      ]
    });

    await prisma.notification.createMany({
      data: [
        {
          recipientId: freelancer.id,
          type: "job.invitation.created",
          title: "New job invitation",
          message: "A company invited you to a mock job.",
          payload: {
            jobId: invitedJob.id
          },
          deliveryStatus: "SENT",
          sentAt: new Date()
        },
        {
          recipientId: freelancer.id,
          type: "milestone.due_soon",
          title: `Milestone due soon (${dueSoonJob.id})`,
          message: "A mock milestone deadline is approaching soon.",
          payload: {
            jobId: dueSoonJob.id
          },
          deliveryStatus: "SENT",
          sentAt: new Date()
        }
      ]
    });
  }
};

const main = async () => {
  await upsertAdmin();
  const company = await upsertDemoCompany();
  const [aina] = await upsertDemoFreelancers();
  const bulkCompanies = await upsertBulkCompanies();
  const bulkFreelancers = await upsertBulkFreelancers();

  await resetDemoScenario(company.id);
  const demoOpenJob = await createDemoOpenJob(company.id);
  await createDemoActiveJob(company.id, aina.id);
  await createDemoDisputeJob(company.id, aina.id);
  await createDemoCompletedJob(company.id, aina.id);
  await ensureDemoInvitationForAina(company, aina, demoOpenJob);
  const mockOpenJobs = await buildOrUpdateMockOpenJobs(bulkCompanies);
  await seedBulkRequestsAndInbox(bulkCompanies, bulkFreelancers, mockOpenJobs);
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
