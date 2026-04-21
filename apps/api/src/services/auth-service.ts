import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/hash";
import { HttpError } from "../lib/http-error";
import { createSession, deleteSession, getSession } from "../lib/session-store";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import type { LoginInput, PublicUser, RegisterInput } from "@gighub/shared";

const userInclude = {
  freelancerProfile: true,
  companyProfile: true
} as const;

type UserWithProfile = Awaited<ReturnType<typeof findUserById>>;

const toPublicUser = (user: NonNullable<UserWithProfile>): PublicUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name:
    user.role === "company"
      ? user.companyProfile?.companyName ?? user.email
      : user.freelancerProfile?.displayName ?? user.email
});

const issueSession = async (user: NonNullable<UserWithProfile>) => {
  const sessionId = randomUUID();

  await createSession({
    sessionId,
    userId: user.id,
    role: user.role
  });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({
      userId: user.id,
      role: user.role
    }),
    refreshToken: signRefreshToken({
      userId: user.id,
      role: user.role,
      sessionId
    })
  };
};

const findUserByEmail = (email: string) =>
  prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: userInclude
  });

const findUserById = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: userInclude
  });

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new HttpError(409, "AUTH_EMAIL_TAKEN", "That email is already in use.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      freelancerProfile:
        input.role === "freelancer"
          ? {
              create: {
                displayName: input.name
              }
            }
          : undefined,
      companyProfile:
        input.role === "company"
          ? {
              create: {
                companyName: input.name
              }
            }
          : undefined
    },
    include: userInclude
  });

  return issueSession(user);
};

export const loginUser = async (input: LoginInput) => {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new HttpError(401, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new HttpError(401, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  return issueSession(user);
};

export const refreshUserSession = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  const session = await getSession(payload.sessionId);

  if (!session || session.userId !== payload.userId || session.role !== payload.role) {
    throw new HttpError(401, "AUTH_SESSION_NOT_FOUND", "The session is no longer active.");
  }

  const user = await findUserById(payload.userId);

  if (!user) {
    await deleteSession(payload.sessionId);
    throw new HttpError(401, "AUTH_SESSION_NOT_FOUND", "The session is no longer active.");
  }

  await deleteSession(payload.sessionId);

  return issueSession(user);
};

export const logoutUser = async (refreshToken?: string) => {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    await deleteSession(payload.sessionId);
  } catch {
    return;
  }
};

export const getCurrentUser = async (userId: string) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new HttpError(401, "AUTH_USER_NOT_FOUND", "The session user could not be found.");
  }

  return toPublicUser(user);
};

