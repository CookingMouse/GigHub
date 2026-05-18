import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the first job that has a freelancer and is in a workable state
  const job = await prisma.job.findFirst({
    where: {
      freelancerId: { not: null },
      status: { in: ["IN_PROGRESS", "COMPLETED", "DISPUTED"] }
    },
    include: {
      freelancer: true,
      milestones: {
        orderBy: { sequence: "asc" }
      }
    }
  });

  if (!job) {
    console.log("No suitable job found. Make sure a job has a freelancer assigned.");
    return;
  }

  console.log(`Found job: "${job.title}" (${job.id})`);
  console.log(`Freelancer: ${job.freelancer?.name} (${job.freelancerId})`);
  console.log(`Job status: ${job.status}`);
  console.log(`Milestones: ${job.milestones.length}`);

  // Pick the first milestone that is locked
  const milestone = job.milestones.find((m) =>
    ["UNDER_REVIEW", "APPROVED", "RELEASED", "DISPUTED", "SUBMITTED"].includes(m.status)
  ) ?? job.milestones[0];

  if (!milestone) {
    console.log("No milestones found on this job.");
    return;
  }

  console.log(`\nResetting milestone: "${milestone.title}" (${milestone.id})`);
  console.log(`Current status: ${milestone.status}`);

  // Reset the milestone to IN_PROGRESS so the freelancer can submit
  await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      status: "IN_PROGRESS",
      submittedAt: null,
      reviewDueAt: null,
      approvedAt: null,
      releasedAt: null,
      revisionRequestedAt: null
    }
  });

  // Make sure the job is IN_PROGRESS so submissions are unlocked
  await prisma.job.update({
    where: { id: job.id },
    data: { status: "IN_PROGRESS" }
  });

  console.log(`\n✓ Milestone "${milestone.title}" reset to IN_PROGRESS`);
  console.log(`✓ Job status set to IN_PROGRESS`);
  console.log(`\nThe freelancer (${job.freelancer?.name}) can now upload a deliverable for this milestone.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
