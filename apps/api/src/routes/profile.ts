import { Router } from "express";
import {
  updateCompanyProfileSchema,
  updateFreelancerProfileSchema
} from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { submissionUpload } from "../lib/upload";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { prisma } from "../lib/prisma";
import {
  getCompanyProfile,
  getPublicCompanyProfile,
  getPublicFreelancerProfile,
  getFreelancerProfile,
  getFreelancerResume,
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
  "/freelancers/:freelancerId/resume",
  asyncHandler(async (request, response) => {
    const freelancerId = Array.isArray(request.params.freelancerId)
      ? request.params.freelancerId[0]
      : request.params.freelancerId;

    // Authorization: Only freelancer or company can view resumes
    if (request.auth?.role !== "freelancer" && request.auth?.role !== "company") {
      response.status(403).json({
        code: "FORBIDDEN",
        message: "Only freelancers and companies can view resumes."
      });
      return;
    }

    const { buffer, fileName } = await getFreelancerResume(freelancerId);

    response.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    response.setHeader("Content-Type", "application/pdf");
    response.send(buffer);
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

// ── E2E public key endpoints ───────────────────────────────────────────────

profileRouter.put(
  "/public-key",
  asyncHandler(async (request, response) => {
    const { publicKey } = request.body as { publicKey?: string };

    if (!publicKey || typeof publicKey !== "string" || publicKey.trim().length === 0) {
      response.status(400).json({ code: "INVALID_PUBLIC_KEY", message: "publicKey is required." });
      return;
    }

    await prisma.user.update({
      where: { id: request.auth!.userId },
      data: { publicKey: publicKey.trim() }
    });

    response.json({ data: { success: true } });
  })
);

profileRouter.get(
  "/public-key/:userId",
  asyncHandler(async (request, response) => {
    const userId = Array.isArray(request.params.userId)
      ? request.params.userId[0]
      : request.params.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { publicKey: true }
    });

    response.json({ data: { publicKey: user?.publicKey ?? null } });
  })
);
