import { Router } from "express";
import { generateIncomeStatementSchema, submissionNotesSchema } from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { submissionUpload } from "../lib/upload";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  createFreelancerSubmission,
  getFreelancerMilestoneDetail,
  listFreelancerJobs
} from "../services/freelancer-service";
import {
  generateFreelancerIncomeStatement,
  getFreelancerIncomeStatementPdf,
  getFreelancerIncomeSummary,
  listFreelancerIncomeStatements
} from "../services/income-service";
import { listFreelancerJobMatches } from "../services/job-matching-service";

export const freelancerRouter = Router();

const readParam = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

freelancerRouter.use(requireAuth, requireRole("freelancer"));

freelancerRouter.get(
  "/income",
  asyncHandler(async (request, response) => {
    const summary = await getFreelancerIncomeSummary(request.auth!.userId);
    const statements = await listFreelancerIncomeStatements(request.auth!.userId);

    response.json({
      data: {
        summary,
        statements
      }
    });
  })
);

freelancerRouter.post(
  "/income/statements",
  asyncHandler(async (request, response) => {
    const input = generateIncomeStatementSchema.parse(request.body);
    const statement = await generateFreelancerIncomeStatement(request.auth!.userId, input);

    response.status(201).json({
      data: {
        statement
      }
    });
  })
);

freelancerRouter.get(
  "/income/statements/:statementId/pdf",
  asyncHandler(async (request, response) => {
    const pdf = await getFreelancerIncomeStatementPdf(
      request.auth!.userId,
      readParam(request.params.statementId)
    );

    response.download(pdf.filePath, pdf.fileName);
  })
);

freelancerRouter.get(
  "/job-matches",
  asyncHandler(async (request, response) => {
    const matches = await listFreelancerJobMatches(request.auth!.userId);

    response.json({
      data: {
        matches
      }
    });
  })
);

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
