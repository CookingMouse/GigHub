import { Router } from "express";
import {
  assignFreelancerSchema,
  milestonePlanSchema,
  rejectMilestoneSchema,
  upsertJobDraftSchema
} from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  approveCompanyMilestone,
  assignFreelancerToJob,
  createMockEscrowIntent,
  createCompanyJob,
  getCompanyJob,
  listCompanyJobs,
  publishCompanyJob,
  rejectCompanyMilestone,
  replaceJobMilestones,
  runCompanyAutoReleaseCheck,
  updateCompanyJob,
  validateCompanyJob
} from "../services/job-service";

export const jobsRouter = Router();

jobsRouter.use(requireAuth, requireRole("company"));

const readJobId = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

jobsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const jobs = await listCompanyJobs(request.auth!.userId);

    response.json({
      data: {
        jobs
      }
    });
  })
);

jobsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = upsertJobDraftSchema.parse(request.body);
    const job = await createCompanyJob(request.auth!.userId, input);

    response.status(201).json({
      data: {
        job
      }
    });
  })
);

jobsRouter.get(
  "/:jobId",
  asyncHandler(async (request, response) => {
    const job = await getCompanyJob(request.auth!.userId, readJobId(request.params.jobId));

    response.json({
      data: {
        job
      }
    });
  })
);

jobsRouter.patch(
  "/:jobId",
  asyncHandler(async (request, response) => {
    const input = upsertJobDraftSchema.parse(request.body);
    const job = await updateCompanyJob(request.auth!.userId, readJobId(request.params.jobId), input);

    response.json({
      data: {
        job
      }
    });
  })
);

jobsRouter.post(
  "/:jobId/validate",
  asyncHandler(async (request, response) => {
    const job = await validateCompanyJob(request.auth!.userId, readJobId(request.params.jobId));

    response.json({
      data: {
        job
      }
    });
  })
);

jobsRouter.post(
  "/:jobId/assign",
  asyncHandler(async (request, response) => {
    const input = assignFreelancerSchema.parse(request.body);
    const job = await assignFreelancerToJob(
      request.auth!.userId,
      readJobId(request.params.jobId),
      input.freelancerId
    );

    response.json({
      data: {
        job
      }
    });
  })
);

jobsRouter.post(
  "/:jobId/escrow/intent",
  asyncHandler(async (request, response) => {
    const intent = await createMockEscrowIntent(request.auth!.userId, readJobId(request.params.jobId));

    response.json({
      data: {
        intent
      }
    });
  })
);

jobsRouter.put(
  "/:jobId/milestones",
  asyncHandler(async (request, response) => {
    const input = milestonePlanSchema.parse(request.body);
    const job = await replaceJobMilestones(request.auth!.userId, readJobId(request.params.jobId), input);

    response.json({
      data: {
        job
      }
    });
  })
);

jobsRouter.post(
  "/:jobId/milestones/:milestoneId/approve",
  asyncHandler(async (request, response) => {
    const result = await approveCompanyMilestone(
      request.auth!.userId,
      readJobId(request.params.jobId),
      readJobId(request.params.milestoneId)
    );

    response.json({
      data: result
    });
  })
);

jobsRouter.post(
  "/:jobId/milestones/:milestoneId/reject",
  asyncHandler(async (request, response) => {
    const input = rejectMilestoneSchema.parse(request.body);
    const job = await rejectCompanyMilestone(
      request.auth!.userId,
      readJobId(request.params.jobId),
      readJobId(request.params.milestoneId),
      input.rejectionReason
    );

    response.json({
      data: {
        job
      }
    });
  })
);

jobsRouter.post(
  "/:jobId/milestones/:milestoneId/auto-release/check",
  asyncHandler(async (request, response) => {
    const result = await runCompanyAutoReleaseCheck(
      request.auth!.userId,
      readJobId(request.params.jobId),
      readJobId(request.params.milestoneId)
    );

    response.json({
      data: result
    });
  })
);

jobsRouter.post(
  "/:jobId/publish",
  asyncHandler(async (request, response) => {
    const job = await publishCompanyJob(request.auth!.userId, readJobId(request.params.jobId));

    response.json({
      data: {
        job
      }
    });
  })
);
