import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/ping", (_request, response) => {
  response.json({
    data: {
      message: "admin-ok"
    }
  });
});

