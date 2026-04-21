import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const [, redisStatus] = await Promise.all([
      prisma.$queryRawUnsafe("SELECT 1"),
      redis.ping()
    ]);

    response.json({
      data: {
        status: "ok",
        services: {
          database: "connected",
          redis: redisStatus === "PONG" ? "connected" : "degraded"
        }
      }
    });
  })
);

