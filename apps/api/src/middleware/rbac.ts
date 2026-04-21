import type { RequestHandler } from "express";
import type { AppRole } from "@gighub/shared";
import { HttpError } from "../lib/http-error";

export const requireRole =
  (...allowedRoles: AppRole[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth) {
      next(new HttpError(401, "AUTH_REQUIRED", "You must be signed in to access this resource."));
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(new HttpError(403, "AUTH_FORBIDDEN", "You do not have access to this resource."));
      return;
    }

    next();
  };

