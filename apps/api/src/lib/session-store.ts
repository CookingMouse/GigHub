import type { AppRole } from "@gighub/shared";
import { env } from "./env";
import { redis } from "./redis";

type SessionRecord = {
  userId: string;
  role: AppRole;
};

const keyFor = (sessionId: string) => `session:${sessionId}`;

export const createSession = async (input: SessionRecord & { sessionId: string }) => {
  await redis.set(keyFor(input.sessionId), JSON.stringify({ userId: input.userId, role: input.role }), {
    EX: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  });
};

export const getSession = async (sessionId: string) => {
  const rawValue = await redis.get(keyFor(sessionId));

  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as SessionRecord;
};

export const deleteSession = async (sessionId: string) => {
  await redis.del(keyFor(sessionId));
};

