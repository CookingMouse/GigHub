import jwt from "jsonwebtoken";
import { z } from "zod";
import type { AppRole } from "@gighub/shared";
import { env } from "./env";
import { HttpError } from "./http-error";

type AccessTokenInput = {
  userId: string;
  role: AppRole;
};

type RefreshTokenInput = AccessTokenInput & {
  sessionId: string;
};

const accessPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["freelancer", "company", "admin"]),
  kind: z.literal("access")
});

const refreshPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["freelancer", "company", "admin"]),
  kind: z.literal("refresh"),
  jti: z.string().uuid()
});

export const signAccessToken = ({ userId, role }: AccessTokenInput) =>
  jwt.sign({ role, kind: "access" }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`
  });

export const signRefreshToken = ({ userId, role, sessionId }: RefreshTokenInput) =>
  jwt.sign({ role, kind: "refresh" }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    jwtid: sessionId,
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`
  });

export const verifyAccessToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const payload = accessPayloadSchema.parse(decoded);

    return {
      userId: payload.sub,
      role: payload.role
    };
  } catch {
    throw new HttpError(401, "AUTH_INVALID_TOKEN", "The access token is invalid or expired.");
  }
};

export const verifyRefreshToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const payload = refreshPayloadSchema.parse(decoded);

    return {
      userId: payload.sub,
      role: payload.role,
      sessionId: payload.jti
    };
  } catch {
    throw new HttpError(401, "AUTH_INVALID_SESSION", "The refresh session is invalid or expired.");
  }
};

