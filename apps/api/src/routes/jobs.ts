import { Router } from "express";
import { upsertJobDraftSchema } from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  createCompanyJob,
  getCompanyJob,
  listCompanyJobs,
  publishCompanyJob,
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
