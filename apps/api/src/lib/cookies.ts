import type { CookieOptions, Response } from "express";
import { env } from "./env";

export const ACCESS_COOKIE_NAME = "gighub_access";
export const REFRESH_COOKIE_NAME = "gighub_refresh";

const baseOptions = (): CookieOptions => {
  const options: CookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
};

export const setAuthCookies = (
  response: Response,
  values: { accessToken: string; refreshToken: string }
) => {
  response.cookie(ACCESS_COOKIE_NAME, values.accessToken, {
    ...baseOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000
  });

  response.cookie(REFRESH_COOKIE_NAME, values.refreshToken, {
    ...baseOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
};

export const clearAuthCookies = (response: Response) => {
  response.clearCookie(ACCESS_COOKIE_NAME, baseOptions());
  response.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
};

