import { Router } from "express";
import { loginSchema, registerSchema } from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { clearAuthCookies, REFRESH_COOKIE_NAME, setAuthCookies } from "../lib/cookies";
import { HttpError } from "../lib/http-error";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser
} from "../services/auth-service";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const result = await registerUser(input);

    setAuthCookies(response, result);

    response.status(201).json({
      data: {
        user: result.user
      }
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const result = await loginUser(input);

    setAuthCookies(response, result);

    response.json({
      data: {
        user: result.user
      }
    });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (request, response) => {
    await logoutUser(request.cookies?.[REFRESH_COOKIE_NAME]);
    clearAuthCookies(response);

    response.json({
      data: {
        success: true
      }
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (request, response) => {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new HttpError(401, "AUTH_REQUIRED", "A refresh session is required.");
    }

    const result = await refreshUserSession(refreshToken);

    setAuthCookies(response, result);

    response.json({
      data: {
        user: result.user
      }
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    const user = await getCurrentUser(request.auth!.userId);

    response.json({
      data: {
        user
      }
    });
  })
);

