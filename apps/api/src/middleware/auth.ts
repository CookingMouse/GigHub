import type { RequestHandler } from "express";
import { ACCESS_COOKIE_NAME } from "../lib/cookies";
import { HttpError } from "../lib/http-error";
import { verifyAccessToken } from "../lib/jwt";

const readBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length);
};

export const requireAuth: RequestHandler = (request, _response, next) => {
  const accessToken =
    request.cookies?.[ACCESS_COOKIE_NAME] ?? readBearerToken(request.headers.authorization);

  if (!accessToken) {
    next(new HttpError(401, "AUTH_REQUIRED", "You must be signed in to access this resource."));
    return;
  }

  try {
    request.auth = verifyAccessToken(accessToken);
    next();
  } catch (error) {
    next(error);
  }
};

