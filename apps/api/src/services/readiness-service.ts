import type { DemoReadinessRecord, ReadinessCheckRecord } from "@gighub/shared";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { glmProviderMode } from "./glm-provider";

const demoAccounts = [
  {
    role: "company" as const,
    email: "company@gighub.demo",
    password: "Company123!",
    label: "Demo company with published, funded, disputed, and completed jobs"
  },
  {
    role: "freelancer" as const,
    email: "aina@example.com",
    password: "Freelancer123!",
    label: "Demo freelancer with assigned milestones, matches, and income records"
  }
];

const check = (
  name: string,
  passed: boolean,
  detail: string,
  warnWhenFalse = false
): ReadinessCheckRecord => ({
  name,
  status: passed ? "pass" : warnWhenFalse ? "warn" : "fail",
  detail
});

export const getDemoReadiness = async (): Promise<DemoReadinessRecord> => {
  const [
    databaseResult,
    redisResult,
    demoCompany,
    demoFreelancers,
    openJobs,
    inProgressJobs,
    openDisputes,
    incomeStatements
  ] = await Promise.allSettled([
    prisma.$queryRawUnsafe("SELECT 1"),
    redis.ping(),
    prisma.user.findUnique({
      where: {
        email: "company@gighub.demo"
      }
    }),
    prisma.user.count({
      where: {
        email: {
          in: ["aina@example.com", "hakim@example.com", "sofia@example.com"]
        },
        role: "freelancer"
      }
    }),
    prisma.job.count({
      where: {
        status: "OPEN"
      }
    }),
    prisma.job.count({
      where: {
        status: "IN_PROGRESS"
      }
    }),
    prisma.dispute.count({
      where: {
        status: {
          in: ["OPEN", "UNDER_REVIEW"]
        }
      }
    }),
    prisma.incomeStatement.count()
  ]);

  const checks: ReadinessCheckRecord[] = [
    check(
      "database",
      databaseResult.status === "fulfilled",
      databaseResult.status === "fulfilled" ? "PostgreSQL query succeeded." : "PostgreSQL query failed."
    ),
    check(
      "redis",
      redisResult.status === "fulfilled" && redisResult.value === "PONG",
      redisResult.status === "fulfilled" ? "Redis ping succeeded." : "Redis ping failed."
    ),
    check(
      "demo company",
      demoCompany.status === "fulfilled" && Boolean(demoCompany.value),
      "Run npm run db:seed if this account is missing."
    ),
    check(
      "demo freelancers",
      demoFreelancers.status === "fulfilled" && demoFreelancers.value >= 3,
      demoFreelancers.status === "fulfilled"
        ? `${demoFreelancers.value} demo freelancer account(s) found.`
        : "Unable to count demo freelancers."
    ),
    check(
      "open job matches",
      openJobs.status === "fulfilled" && openJobs.value > 0,
      openJobs.status === "fulfilled"
        ? `${openJobs.value} open job(s) available for matching.`
        : "Unable to count open jobs.",
      true
    ),
    check(
      "active freelancer work",
      inProgressJobs.status === "fulfilled" && inProgressJobs.value > 0,
      inProgressJobs.status === "fulfilled"
        ? `${inProgressJobs.value} in-progress job(s) available.`
        : "Unable to count active jobs.",
      true
    ),
    check(
      "moderation queue",
      openDisputes.status === "fulfilled" && openDisputes.value > 0,
      openDisputes.status === "fulfilled"
        ? `${openDisputes.value} open dispute(s) available.`
        : "Unable to count disputes.",
      true
    ),
    check(
      "income statements",
      incomeStatements.status === "fulfilled" && incomeStatements.value > 0,
      incomeStatements.status === "fulfilled"
        ? `${incomeStatements.value} generated statement(s) found.`
        : "Unable to count income statements.",
      true
    )
  ];
  const failed = checks.some((item) => item.status === "fail");
  const warned = checks.some((item) => item.status === "warn");

  return {
    status: failed ? "degraded" : warned ? "needs_seed" : "ready",
    generatedAt: new Date().toISOString(),
    providers: {
      glm: glmProviderMode,
      payments: env.PAYMENT_PROVIDER,
      storage: env.STORAGE_PROVIDER
    },
    checks,
    demoAccounts,
    demoFlow: [
      "Sign in as the demo company to inspect published jobs, escrow, milestones, review, and disputes.",
      "Sign in as Aina to view assigned work, job matches, income intelligence, and statement generation.",
      "Keep GLM_MODE=mock until the live Zhipu API key is wired in the final integration pass."
    ]
  };
};
