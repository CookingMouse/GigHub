import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    where: { freelancerId: { not: null } },
    include: {
      freelancer: true,
      milestones: { orderBy: { sequence: "asc" } }
    }
  });

  for (const job of jobs) {
    console.log(`\nJOB: "${job.title}" | status: ${job.status}`);
    console.log(`Freelancer: ${job.freelancer?.name}`);
    for (const m of job.milestones) {
      console.log(`  [${m.sequence}] "${m.title}" → status: ${m.status}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
