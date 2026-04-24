import { Router } from "express";
import {
  updateCompanyProfileSchema,
  updateFreelancerProfileSchema
} from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { submissionUpload } from "../lib/upload";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  getCompanyProfile,
  getPublicCompanyProfile,
  getFreelancerProfile,
  updateCompanyProfile,
  updateFreelancerProfile,
  uploadFreelancerResume,
  listPublicCompanies
} from "../services/profile-service";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  "/companies",
  asyncHandler(async (request, response) => {
    const companies = await listPublicCompanies();

    response.json({
      data: {
        companies
      }
    });
  })
);

profileRouter.get(
  "/freelancer",
  requireRole("freelancer"),
  asyncHandler(async (request, response) => {
    const profile = await getFreelancerProfile(request.auth!.userId);

    response.json({
      data: {
        profile
      }
    });
  })
);

profileRouter.patch(
  "/freelancer",
  requireRole("freelancer"),
  asyncHandler(async (request, response) => {
    const input = updateFreelancerProfileSchema.parse(request.body);
    const profile = await updateFreelancerProfile(request.auth!.userId, input);

    response.json({
      data: {
        profile
      }
    });
  })
);

profileRouter.get(
  "/companies/:companyId",
  asyncHandler(async (request, response) => {
    const company = await getPublicCompanyProfile(
      Array.isArray(request.params.companyId) ? request.params.companyId[0] : request.params.companyId
    );

    response.json({
      data: {
        company
      }
    });
  })
);

profileRouter.get(
  "/freelancers/:freelancerId",
  asyncHandler(async (request, response) => {
    const profile = await getPublicFreelancerProfile(
      Array.isArray(request.params.freelancerId) ? request.params.freelancerId[0] : request.params.freelancerId
    );

    response.json({
      data: {
        profile
      }
    });
  })
);

profileRouter.post(
  "/freelancer/resume",
  requireRole("freelancer"),
  submissionUpload.single("file"),
  asyncHandler(async (request, response) => {
    const profile = await uploadFreelancerResume(request.auth!.userId, request.file);

    response.json({
      data: {
        profile
      }
    });
  })
);

profileRouter.get(
  "/company",
  requireRole("company"),
  asyncHandler(async (request, response) => {
    const profile = await getCompanyProfile(request.auth!.userId);

    response.json({
      data: {
        profile
      }
    });
  })
);

profileRouter.patch(
  "/company",
  requireRole("company"),
  asyncHandler(async (request, response) => {
    const input = updateCompanyProfileSchema.parse(request.body);
    const profile = await updateCompanyProfile(request.auth!.userId, input);

    response.json({
      data: {
        profile
      }
    });
  })
);
