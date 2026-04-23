import type {
  CompanyProfileRecord,
  FreelancerProfileRecord,
  PublicCompanyProfileRecord,
  UpdateCompanyProfileInput,
  UpdateFreelancerProfileInput
} from "@gighub/shared";
import { HttpError } from "../lib/http-error";
import { extractFileMetadata } from "./file-metadata-service";
import { removeStoredSubmissionFile, storeSubmissionFile } from "./file-storage-service";
import { prisma } from "../lib/prisma";
const prismaAny = prisma as any;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const getFreelancerProfile = async (userId: string): Promise<FreelancerProfileRecord> => {
  const user = await prismaAny.user.findFirst({
    where: {
      id: userId,
      role: "freelancer"
    },
    include: {
      freelancerProfile: true
    }
  });

  if (!user?.freelancerProfile) {
    throw new HttpError(404, "PROFILE_NOT_FOUND", "Freelancer profile was not found.");
  }

  return {
    displayName: user.freelancerProfile.displayName,
    portfolioUrl: user.freelancerProfile.portfolioUrl ?? null,
    skills: normalizeStringArray(user.freelancerProfile.skills),
    headline: user.freelancerProfile.headline ?? null,
    bio: user.freelancerProfile.bio ?? null,
    experienceYears: user.freelancerProfile.experienceYears ?? null,
    pastProjects: normalizeStringArray(user.freelancerProfile.pastProjects),
    resumeFileName: user.freelancerProfile.resumeFileName ?? null,
    resumeUploadedAt: user.freelancerProfile.resumeUploadedAt?.toISOString() ?? null
  };
};

export const updateFreelancerProfile = async (
  userId: string,
  input: UpdateFreelancerProfileInput
): Promise<FreelancerProfileRecord> => {
  await prismaAny.freelancerProfile.update({
    where: {
      userId
    },
    data: {
      displayName: input.displayName,
      portfolioUrl: input.portfolioUrl === "" ? null : input.portfolioUrl,
      skills: input.skills,
      headline: input.headline,
      bio: input.bio,
      experienceYears: input.experienceYears,
      pastProjects: input.pastProjects
    }
  });

  return getFreelancerProfile(userId);
};

export const uploadFreelancerResume = async (
  userId: string,
  file: Express.Multer.File | undefined
): Promise<FreelancerProfileRecord> => {
  if (!file) {
    throw new HttpError(400, "RESUME_FILE_REQUIRED", "Attach one resume file.");
  }

  const profile = await prismaAny.freelancerProfile.findUnique({
    where: {
      userId
    }
  });

  if (!profile) {
    throw new HttpError(404, "PROFILE_NOT_FOUND", "Freelancer profile was not found.");
  }

  const metadata = await extractFileMetadata(file.buffer, file.originalname);
  const stored = await storeSubmissionFile({
    fileBuffer: file.buffer,
    format: metadata.format
  });

  try {
    const previousStorageKey = profile.resumeStorageKey;

    await prismaAny.freelancerProfile.update({
      where: {
        userId
      },
      data: {
        resumeFileName: file.originalname,
        resumeStorageKey: stored.storageKey,
        resumeUploadedAt: new Date()
      }
    });

    if (previousStorageKey) {
      await removeStoredSubmissionFile(previousStorageKey);
    }
  } catch (error) {
    await removeStoredSubmissionFile(stored.storageKey);
    throw error;
  }

  return getFreelancerProfile(userId);
};

export const getCompanyProfile = async (userId: string): Promise<CompanyProfileRecord> => {
  const user = await prismaAny.user.findFirst({
    where: {
      id: userId,
      role: "company"
    },
    include: {
      companyProfile: true,
      companyJobs: {
        orderBy: {
          updatedAt: "desc"
        },
        take: 50
      }
    }
  });

  if (!user?.companyProfile) {
    throw new HttpError(404, "PROFILE_NOT_FOUND", "Company profile was not found.");
  }

  return {
    companyName: user.companyProfile.companyName,
    website: user.companyProfile.website ?? null,
    industry: user.companyProfile.industry ?? null,
    about: user.companyProfile.about ?? null,
    postedJobs: user.companyJobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      updatedAt: job.updatedAt.toISOString()
    }))
  };
};

export const updateCompanyProfile = async (
  userId: string,
  input: UpdateCompanyProfileInput
): Promise<CompanyProfileRecord> => {
  await prismaAny.companyProfile.update({
    where: {
      userId
    },
    data: {
      companyName: input.companyName,
      website: input.website === "" ? null : input.website,
      industry: input.industry,
      about: input.about
    }
  });

  return getCompanyProfile(userId);
};

export const getPublicCompanyProfile = async (companyUserId: string): Promise<PublicCompanyProfileRecord> => {
  const user = await prismaAny.user.findFirst({
    where: {
      id: companyUserId,
      role: "company"
    },
    include: {
      companyProfile: true
    }
  });

  if (!user?.companyProfile) {
    throw new HttpError(404, "PROFILE_NOT_FOUND", "Company profile was not found.");
  }

  return {
    id: user.id,
    companyName: user.companyProfile.companyName,
    website: user.companyProfile.website ?? null,
    industry: user.companyProfile.industry ?? null,
    about: user.companyProfile.about ?? null
  };
};
