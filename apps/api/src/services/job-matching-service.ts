import { Prisma } from "@prisma/client";
import type { JobMatchRecord } from "@gighub/shared";
import { prisma } from "../lib/prisma";

const openJobInclude = {
  company: {
    include: {
      companyProfile: true
    }
  },
  brief: true
} satisfies Prisma.JobInclude;

type OpenJob = Prisma.JobGetPayload<{
  include: typeof openJobInclude;
}>;

const normalizeStringArray = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const companyName = (job: OpenJob) => job.company.companyProfile?.companyName ?? job.company.name;

const profileSkills = (value: Prisma.JsonValue | null | undefined) =>
  normalizeStringArray(value).map((skill) => skill.toLowerCase());

const jobKeywords = (job: OpenJob) => {
  const values = [
    job.title,
    job.brief?.overview ?? "",
    ...normalizeStringArray(job.brief?.scope),
    ...normalizeStringArray(job.brief?.deliverables),
    ...normalizeStringArray(job.brief?.requirements),
    ...normalizeStringArray(job.brief?.acceptanceCriteria)
  ];

  return new Set(values.flatMap(tokenize));
};

const requiredSkillsForJob = (job: OpenJob) => {
  const keywords = jobKeywords(job);
  const skills = [
    ["design", "Design"],
    ["figma", "Figma"],
    ["layout", "UI Design"],
    ["copy", "Writing"],
    ["content", "Writing"],
    ["translation", "Translation"],
    ["software", "Software Development"],
    ["api", "Backend Development"],
    ["app", "Application Development"],
    ["journalism", "Journalism"]
  ];

  return skills.flatMap(([keyword, label]) => (keywords.has(keyword) ? [label] : []));
};

const scoreJob = (job: OpenJob, skills: string[], portfolioUrl: string | null): JobMatchRecord => {
  const keywords = jobKeywords(job);
  const reasons: string[] = [];
  let score = 35;

  skills.forEach((skill) => {
    const skillTokens = tokenize(skill);
    const hits = skillTokens.filter((token) => keywords.has(token)).length;

    if (hits > 0) {
      score += Math.min(18, hits * 9);
      reasons.push(`Skill match: ${skill}`);
    }
  });

  if (portfolioUrl) {
    score += 8;
    reasons.push("Portfolio profile is available for company review.");
  }

  if (job.brief?.glmBriefScore && job.brief.glmBriefScore >= 80) {
    score += 7;
    reasons.push("The brief has a strong validation score.");
  }

  const requiredSkills = Array.from(new Set(requiredSkillsForJob(job)));

  if (requiredSkills.length > 0 && reasons.length === 0) {
    reasons.push(`Brief appears relevant to ${requiredSkills.slice(0, 2).join(" and ")} work.`);
  }

  return {
    jobId: job.id,
    title: job.title,
    companyName: companyName(job),
    budget: Number(job.budget),
    milestoneCount: job.milestoneCount,
    publishedAt: job.publishedAt?.toISOString() ?? null,
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    reasons: reasons.length > 0 ? reasons.slice(0, 4) : ["Open job with no conflicting assignment."],
    requiredSkills
  };
};

export const listFreelancerJobMatches = async (freelancerId: string) => {
  const [freelancer, jobs] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: freelancerId
      },
      include: {
        freelancerProfile: true
      }
    }),
    prisma.job.findMany({
      where: {
        status: "OPEN",
        freelancerId: null
      },
      include: openJobInclude,
      orderBy: {
        publishedAt: "desc"
      }
    })
  ]);

  const skills = profileSkills(freelancer?.freelancerProfile?.skills);
  const portfolioUrl = freelancer?.freelancerProfile?.portfolioUrl ?? null;

  return jobs
    .map((job) => scoreJob(job, skills, portfolioUrl))
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 10);
};
