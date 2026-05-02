import type {
  CompanyProfileRecord,
  FreelancerProfileRecord,
  PublicFreelancerProfileRecord,
  PublicCompanyProfileRecord,
  UpdateCompanyProfileInput,
  UpdateFreelancerProfileInput
} from "@gighub/shared";
import { HttpError } from "../lib/http-error";
import { extractFileMetadata } from "./file-metadata-service";
import {
  removeStoredSubmissionFile,
  retrieveSubmissionFile,
  storeSubmissionFile
} from "./file-storage-service";
import { prisma } from "../lib/prisma";
import { extractTextFromFile } from "../lib/text-extraction";
import { selectedGLMProvider } from "./glm-provider";

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
    resumeUploadedAt: user.freelancerProfile.resumeUploadedAt?.toISOString() ?? null,
    hourlyRate: null, // TODO: Add to schema when ready
    experience: null, // TODO: Add to schema when ready
    portfolio: null, // TODO: Add to schema when ready
    languages: null, // TODO: Add to schema when ready
    glmMatchScore: null // TODO: Add to schema when ready
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
    format: metadata.format,
    encrypted: false
  });

  try {
    const previousStorageKey = profile.resumeStorageKey;

    // AI Resume Parsing
    let aiParsedData = null;
    try {
      const extractedText = await extractTextFromFile(file.buffer, file.originalname);
      if (extractedText.trim()) {
        aiParsedData = await (selectedGLMProvider as any).parseResume(extractedText);
      }
    } catch (aiError) {
      console.error("AI Resume Parsing failed, but continuing with upload:", aiError);
    }

    await prismaAny.freelancerProfile.update({
      where: {
        userId
      },
      data: {
        resumeFileName: file.originalname,
        resumeStorageKey: stored.storageKey,
        resumeUploadedAt: new Date(),
        // Update profile fields if AI parsing succeeded
        ...(aiParsedData && {
          skills: aiParsedData.skills.length > 0 ? aiParsedData.skills : profile.skills,
          experienceYears: aiParsedData.experienceYears || profile.experienceYears,
          headline: aiParsedData.headline || profile.headline,
          bio: aiParsedData.bio || profile.bio
        })
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

export const getFreelancerResume = async (
  freelancerUserId: string
): Promise<{ buffer: Buffer; fileName: string }> => {
  const profile = await prismaAny.freelancerProfile.findUnique({
    where: {
      userId: freelancerUserId
    }
  });

  if (!profile?.resumeStorageKey) {
    throw new HttpError(404, "RESUME_NOT_FOUND", "Freelancer resume was not found.");
  }

  const buffer = await retrieveSubmissionFile(profile.resumeStorageKey);

  return {
    buffer,
    fileName: profile.resumeFileName || "resume.pdf"
  };
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

export const getPublicFreelancerProfile = async (freelancerId: string): Promise<PublicFreelancerProfileRecord> => {
  const user = await prismaAny.user.findUnique({
    where: {
      id: freelancerId
    },
    include: {
      freelancerProfile: true
    }
  });

  if (!user || user.role !== "freelancer") {
    throw new HttpError(404, "PROFILE_NOT_FOUND", "Freelancer was not found.");
  }

  return {
    id: user.id,
    name: user.name,
    displayName: user.freelancerProfile?.displayName ?? user.name,
    portfolioUrl: user.freelancerProfile?.portfolioUrl ?? null,
    skills: user.freelancerProfile ? normalizeStringArray(user.freelancerProfile.skills) : [],
    headline: user.freelancerProfile?.headline ?? "Professional Freelancer",
    bio: user.freelancerProfile?.bio ?? "This freelancer hasn't updated their profile biography yet.",
    experienceYears: user.freelancerProfile?.experienceYears ?? null
  };
};

export const listPublicCompanies = async (): Promise<PublicCompanyProfileRecord[]> => {
  const companies = await prismaAny.user.findMany({
    where: {
      role: "company"
    },
    include: {
      companyProfile: true
    }
  });

  return companies
    .filter((c: any) => c.companyProfile)
    .map((c: any) => ({
      id: c.id,
      companyName: c.companyProfile.companyName,
      website: c.companyProfile.website ?? null,
      industry: c.companyProfile.industry ?? null,
      about: c.companyProfile.about ?? null
    }));
};
