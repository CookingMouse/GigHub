import { Router } from "express";
import { submissionNotesSchema } from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { submissionUpload } from "../lib/upload";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  createFreelancerSubmission,
  getFreelancerMilestoneDetail,
  listFreelancerJobs
} from "../services/freelancer-service";

export const freelancerRouter = Router();

const readParam = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

freelancerRouter.use(requireAuth, requireRole("freelancer"));

freelancerRouter.get(
  "/jobs",
  asyncHandler(async (request, response) => {
    const jobs = await listFreelancerJobs(request.auth!.userId);

    response.json({
      data: {
        jobs
      }
    });
  })
);

freelancerRouter.get(
  "/milestones/:milestoneId",
  asyncHandler(async (request, response) => {
    const milestone = await getFreelancerMilestoneDetail(
      request.auth!.userId,
      readParam(request.params.milestoneId)
    );

    response.json({
      data: {
        milestone
      }
    });
  })
);

freelancerRouter.post(
  "/milestones/:milestoneId/submissions",
  submissionUpload.single("file"),
  asyncHandler(async (request, response) => {
    const input = submissionNotesSchema.parse({
      notes: typeof request.body?.notes === "string" ? request.body.notes : ""
    });
    const milestone = await createFreelancerSubmission(
      request.auth!.userId,
      readParam(request.params.milestoneId),
      request.file,
      input.notes
    );

    response.status(201).json({
      data: {
        milestone
      }
    });
  })
);
