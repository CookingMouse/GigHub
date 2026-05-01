import { Prisma } from "@prisma/client";
import type {
  CompanyJobApplicationRecord,
  CompanyJobInvitationRecord,
  CreateJobApplicationInput,
  CreateJobInvitationInput,
  JobAvailabilityDetailRecord,
  JobApplicationRecord,
  JobAvailabilityRecord,
  JobInvitationRecord,
  WorkerRecommendationRecord
} from "@gighub/shared";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
const prismaAny = prisma as any;

const companyName = (job: {
  company: {
    name: string;
    companyProfile: {
      companyName: string;
    } | null;
  };
}) => job.company.companyProfile?.companyName ?? job.company.name;

const ensureOpenJobOrThrow = async (jobId: string) => {
  const job = await prisma.job.findUnique({
    where: {
      id: jobId
    },
    include: {
      company: {
        include: {
          companyProfile: true
        }
      }
    }
  });

  if (!job) {
    throw new HttpError(404, "JOB_NOT_FOUND", "That job could not be found.");
  }

  if (job.status !== "OPEN") {
    throw new HttpError(409, "JOB_NOT_OPEN", "Only open jobs can accept applications.");
  }

  return job;
};

export const listJobAvailability = async (): Promise<JobAvailabilityRecord[]> => {
  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN"
    },
    include: {
      company: {
        include: {
          companyProfile: true
        }
      }
    },
    orderBy: {
      publishedAt: "desc"
    }
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    companyName: companyName(job),
    budget: Number(job.budget),
    milestoneCount: job.milestoneCount,
    publishedAt: job.publishedAt?.toISOString() ?? null,
    description: job.description ?? undefined
  }));
};

export const getJobAvailabilityDetail = async (jobId: string): Promise<JobAvailabilityDetailRecord> => {
  const job = await prisma.job.findUnique({
    where: {
      id: jobId,
      status: "OPEN"
    },
    include: {
      company: {
        include: {
          companyProfile: true
        }
      },
      brief: true
    }
  });

  if (!job) {
    throw new HttpError(404, "JOB_NOT_FOUND", "That job could not be found or is no longer open.");
  }

  const normalizeStringArray = (value: Prisma.JsonValue | null | undefined) => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  };

  return {
    id: job.id,
    title: job.title,
    companyName: companyName(job),
    budget: Number(job.budget),
    milestoneCount: job.milestoneCount,
    publishedAt: job.publishedAt?.toISOString() ?? null,
    description: job.description ?? undefined,
    company: {
      name: companyName(job),
      industry: job.company.companyProfile?.industry ?? null,
      website: job.company.companyProfile?.website ?? null,
      about: job.company.companyProfile?.about ?? null
    },
    brief: {
      overview: job.brief?.overview ?? "",
      deliverables: normalizeStringArray(job.brief?.deliverables),
      acceptanceCriteria: normalizeStringArray(job.brief?.acceptanceCriteria)
    }
  };
};

export const applyToJob = async (
  freelancerId: string,
  jobId: string,
  input: CreateJobApplicationInput
) => {
  const job = await ensureOpenJobOrThrow(jobId);

  if (job.freelancerId) {
    throw new HttpError(
      409,
      "JOB_ALREADY_ASSIGNED",
      "This job is already assigned and cannot accept new applications."
    );
  }

  await prisma.jobApplication.upsert({
    where: {
      jobId_freelancerId: {
        jobId,
        freelancerId
      }
    },
    create: {
      jobId,
      freelancerId,
      coverNote: input.coverNote || null,
      status: "PENDING"
    },
    update: {
      coverNote: input.coverNote || null,
      status: "PENDING"
    }
  });

  await prisma.notification.create({
    data: {
      recipientId: job.companyId,
      type: "job.application.created",
      title: "New freelancer application",
      message: "A freelancer applied to one of your open jobs.",
      payload: {
        jobId,
        freelancerId
      },
      deliveryStatus: "SENT",
      sentAt: new Date()
    }
  });
};

export const listFreelancerApplications = async (
  freelancerId: string
): Promise<JobApplicationRecord[]> => {
  const applications = await prisma.jobApplication.findMany({
    where: {
      freelancerId
    },
    include: {
      job: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return applications.map((application) => ({
    id: application.id,
    jobId: application.jobId,
    jobTitle: application.job.title,
    status: application.status,
    coverNote: application.coverNote ?? null,
    appliedAt: application.appliedAt.toISOString(),
    updatedAt: application.updatedAt.toISOString()
  }));
};

export const listCompanyApplications = async (
  companyId: string
): Promise<CompanyJobApplicationRecord[]> => {
  const applications = await prisma.jobApplication.findMany({
    where: {
      job: {
        companyId
      }
    },
    include: {
      freelancer: {
        include: {
          freelancerProfile: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return applications.map((application) => ({
    id: application.id,
    freelancerId: application.freelancerId,
    freelancerName: application.freelancer.name,
    freelancerEmail: application.freelancer.email,
    freelancerDisplayName:
      application.freelancer.freelancerProfile?.displayName ?? application.freelancer.name,
    status: application.status,
    coverNote: application.coverNote ?? null,
    appliedAt: application.appliedAt.toISOString()
  }));
};

export const resolveCompanyApplication = async (
  companyId: string,
  applicationId: string,
  action: "accept" | "reject"
) => {
  const application = await prisma.jobApplication.findUnique({
    where: {
      id: applicationId
    },
    include: {
      job: true
    }
  });

  if (!application || application.job.companyId !== companyId) {
    throw new HttpError(404, "APPLICATION_NOT_FOUND", "That job request could not be found.");
  }

  if (application.status !== "PENDING") {
    throw new HttpError(
      409,
      "APPLICATION_ALREADY_RESOLVED",
      "This job request was already resolved."
    );
  }

  await prisma.$transaction(async (tx) => {
    if (action === "accept") {
      await tx.job.update({
        where: {
          id: application.jobId
        },
        data: {
          freelancerId: application.freelancerId,
          assignedAt: new Date(),
          status: "ASSIGNED"
        }
      });
    }

    await tx.jobApplication.update({
      where: {
        id: application.id
      },
      data: {
        status: action === "accept" ? "ACCEPTED" : "REJECTED"
      }
    });

    if (action === "accept") {
      await tx.jobApplication.updateMany({
        where: {
          jobId: application.jobId,
          id: {
            not: application.id
          },
          status: "PENDING"
        },
        data: {
          status: "REJECTED"
        }
      });
    }

    await tx.notification.create({
      data: {
        recipientId: application.freelancerId,
        type: "job.application.resolved",
        title: action === "accept" ? "Job request accepted" : "Job request rejected",
        message:
          action === "accept"
            ? "Your application was accepted by the company."
            : "Your application was not selected by the company.",
        payload: {
          jobId: application.jobId,
          applicationId: application.id,
          action
        },
        deliveryStatus: "SENT",
        sentAt: new Date()
      }
    });
  });
};

export const createCompanyInvitation = async (
  companyId: string,
  jobId: string,
  input: CreateJobInvitationInput
) => {
  const job = await ensureOpenJobOrThrow(jobId);

  if (job.companyId !== companyId) {
    throw new HttpError(403, "AUTH_FORBIDDEN", "You can only invite freelancers for your own jobs.");
  }

  const freelancer = await prisma.user.findFirst({
    where: {
      id: input.freelancerId,
      role: "freelancer"
    }
  });

  if (!freelancer) {
    throw new HttpError(404, "FREELANCER_NOT_FOUND", "That freelancer could not be found.");
  }

  const invitation = await prismaAny.jobInvitation.create({
    data: {
      jobId,
      companyId,
      freelancerId: input.freelancerId,
      note: input.note || null
    }
  });

  await prisma.notification.create({
    data: {
      recipientId: input.freelancerId,
      type: "job.invitation.created",
      title: "New job invitation",
      message: "A company invited you to a job request.",
      payload: {
        invitationId: invitation.id,
        jobId
      },
      deliveryStatus: "SENT",
      sentAt: new Date()
    }
  });
};

export const listFreelancerInvitations = async (
  freelancerId: string
): Promise<JobInvitationRecord[]> => {
  const invitations = await prismaAny.jobInvitation.findMany({
    where: {
      freelancerId
    },
    include: {
      job: {
        include: {
          company: {
            include: {
              companyProfile: true
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return invitations.map((invitation: any) => ({
    id: invitation.id,
    jobId: invitation.jobId,
    jobTitle: invitation.job.title,
    companyId: invitation.companyId,
    companyName: companyName(invitation.job),
    note: invitation.note ?? null,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString() ?? null
  }));
};

export const listCompanyInvitations = async (
  companyId: string
): Promise<CompanyJobInvitationRecord[]> => {
  const invitations = await prismaAny.jobInvitation.findMany({
    where: {
      companyId
    },
    include: {
      job: true,
      freelancer: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return invitations.map((invitation: any) => ({
    id: invitation.id,
    jobId: invitation.jobId,
    jobTitle: invitation.job.title,
    freelancerId: invitation.freelancerId,
    freelancerName: invitation.freelancer.name,
    freelancerEmail: invitation.freelancer.email,
    note: invitation.note ?? null,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString() ?? null
  }));
};

export const respondFreelancerInvitation = async (
  freelancerId: string,
  invitationId: string,
  action: "accept" | "reject"
) => {
  const invitation = await prismaAny.jobInvitation.findUnique({
    where: {
      id: invitationId
    },
    include: {
      job: true
    }
  });

  if (!invitation || invitation.freelancerId !== freelancerId) {
    throw new HttpError(404, "INVITATION_NOT_FOUND", "That job invitation could not be found.");
  }

  if (invitation.status !== "PENDING") {
    throw new HttpError(
      409,
      "INVITATION_ALREADY_RESOLVED",
      "This invitation is already resolved."
    );
  }

  await prisma.$transaction(async (tx) => {
    if (action === "accept") {
      if (invitation.job.status !== "OPEN") {
        throw new HttpError(409, "JOB_NOT_OPEN", "This job is no longer open.");
      }

      await tx.job.update({
        where: {
          id: invitation.jobId
        },
        data: {
          freelancerId,
          assignedAt: new Date(),
          status: "ASSIGNED"
        }
      });
    }

    await (tx as any).jobInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        status: action === "accept" ? "ACCEPTED" : "REJECTED",
        respondedAt: new Date()
      }
    });

    if (action === "accept") {
      await (tx as any).jobInvitation.updateMany({
        where: {
          jobId: invitation.jobId,
          id: {
            not: invitation.id
          },
          status: "PENDING"
        },
        data: {
          status: "CANCELLED"
        }
      });
    }

    await tx.notification.create({
      data: {
        recipientId: invitation.companyId,
        type: "job.invitation.responded",
        title: action === "accept" ? "Invitation accepted" : "Invitation rejected",
        message:
          action === "accept"
            ? "A freelancer accepted your invitation."
            : "A freelancer rejected your invitation.",
        payload: {
          invitationId: invitation.id,
          jobId: invitation.jobId,
          action
        },
        deliveryStatus: "SENT",
        sentAt: new Date()
      }
    });
  });
};
