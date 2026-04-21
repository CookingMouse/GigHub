import { createClient } from "redis";
import { env } from "./env";

declare global {
  var __gighubRedis__: ReturnType<typeof createClient> | undefined;
}

export const redis =
  global.__gighubRedis__ ??
  createClient({
    url: env.REDIS_URL
  });

if (process.env.NODE_ENV !== "production") {
  global.__gighubRedis__ = redis;
}

