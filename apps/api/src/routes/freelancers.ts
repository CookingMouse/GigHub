import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { listAssignableFreelancers } from "../services/job-service";

export const freelancersRouter = Router();

freelancersRouter.use(requireAuth, requireRole("company"));

freelancersRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const freelancers = await listAssignableFreelancers();

    response.json({
      data: {
        freelancers
      }
    });
  })
);
