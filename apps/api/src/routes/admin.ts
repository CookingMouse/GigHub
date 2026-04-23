import { Router } from "express";
import { resolveDisputeSchema } from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  getAdminDisputeDetail,
  getAdminJobTrace,
  listAdminAuditLogs,
  listAdminDisputes,
  listAdminIncomeStatements,
  resolveAdminDispute
} from "../services/admin-service";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

const readParam = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

adminRouter.get("/ping", (_request, response) => {
  response.json({
    data: {
      message: "admin-ok"
    }
  });
});

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (_request, response) => {
    const auditLogs = await listAdminAuditLogs();
    const incomeStatements = await listAdminIncomeStatements();

    response.json({
      data: {
        auditLogs,
        incomeStatements
      }
    });
  })
);

adminRouter.get(
  "/jobs/:jobId/trace",
  asyncHandler(async (request, response) => {
    const trace = await getAdminJobTrace(readParam(request.params.jobId));

    response.json({
      data: {
        trace
      }
    });
  })
);

adminRouter.get(
  "/disputes",
  asyncHandler(async (_request, response) => {
    const disputes = await listAdminDisputes();

    response.json({
      data: {
        disputes
      }
    });
  })
);

adminRouter.get(
  "/disputes/:disputeId",
  asyncHandler(async (request, response) => {
    const dispute = await getAdminDisputeDetail(readParam(request.params.disputeId));

    response.json({
      data: {
        dispute
      }
    });
  })
);

adminRouter.post(
  "/disputes/:disputeId/resolve",
  asyncHandler(async (request, response) => {
    const input = resolveDisputeSchema.parse(request.body);
    const dispute = await resolveAdminDispute(
      request.auth!.userId,
      readParam(request.params.disputeId),
      input
    );

    response.json({
      data: {
        dispute
      }
    });
  })
);
