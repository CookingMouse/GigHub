import { Router } from "express";
import {
  createJobApplicationSchema,
  createJobInvitationSchema,
  respondJobInvitationSchema
} from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  applyToJob,
  createCompanyInvitation,
  listCompanyApplications,
  listCompanyInvitations,
  listFreelancerApplications,
  listFreelancerInvitations,
  listJobAvailability,
  resolveCompanyApplication,
  respondFreelancerInvitation
} from "../services/request-service";

export const requestsRouter = Router();
const readParam = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

requestsRouter.use(requireAuth);

requestsRouter.get(
  "/freelancer/availability",
  requireRole("freelancer"),
  asyncHandler(async (_request, response) => {
    const jobs = await listJobAvailability();

    response.json({
      data: {
        jobs
      }
    });
  })
);

requestsRouter.post(
  "/freelancer/jobs/:jobId/apply",
  requireRole("freelancer"),
  asyncHandler(async (request, response) => {
    const input = createJobApplicationSchema.parse(request.body);
    await applyToJob(request.auth!.userId, readParam(request.params.jobId), input);

    response.status(201).json({
      data: {
        success: true
      }
    });
  })
);

requestsRouter.get(
  "/freelancer/applications",
  requireRole("freelancer"),
  asyncHandler(async (request, response) => {
    const applications = await listFreelancerApplications(request.auth!.userId);
    const invitations = await listFreelancerInvitations(request.auth!.userId);

    response.json({
      data: {
        applications,
        invitations
      }
    });
  })
);

requestsRouter.post(
  "/freelancer/invitations/:invitationId/respond",
  requireRole("freelancer"),
  asyncHandler(async (request, response) => {
    const input = respondJobInvitationSchema.parse(request.body);
    await respondFreelancerInvitation(
      request.auth!.userId,
      readParam(request.params.invitationId),
      input.action
    );

    response.json({
      data: {
        success: true
      }
    });
  })
);

requestsRouter.get(
  "/company/requests",
  requireRole("company"),
  asyncHandler(async (request, response) => {
    const applications = await listCompanyApplications(request.auth!.userId);
    const invitations = await listCompanyInvitations(request.auth!.userId);

    response.json({
      data: {
        applications,
        invitations
      }
    });
  })
);

requestsRouter.post(
  "/company/jobs/:jobId/invitations",
  requireRole("company"),
  asyncHandler(async (request, response) => {
    const input = createJobInvitationSchema.parse(request.body);
    await createCompanyInvitation(request.auth!.userId, readParam(request.params.jobId), input);

    response.status(201).json({
      data: {
        success: true
      }
    });
  })
);

requestsRouter.post(
  "/company/applications/:applicationId/:action",
  requireRole("company"),
  asyncHandler(async (request, response) => {
    const action = request.params.action === "accept" ? "accept" : "reject";
    await resolveCompanyApplication(
      request.auth!.userId,
      readParam(request.params.applicationId),
      action
    );

    response.json({
      data: {
        success: true
      }
    });
  })
);
