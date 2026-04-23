import request from "supertest";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { app } from "../app";

describe("health routes", () => {
  beforeAll(async () => {
    await prisma.$connect();

    if (!redis.isOpen) {
      await redis.connect();
    }
  });

  afterAll(async () => {
    if (redis.isOpen) {
      await redis.quit();
    }

    await prisma.$disconnect();
  });

  it("returns demo readiness with provider mode visibility", async () => {
    const response = await request(app).get("/api/v1/health/readiness");

    expect(response.status).toBe(200);
    expect(response.body.data.readiness.providers.glm).toBe("mock");
    expect(response.body.data.readiness.demoAccounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "company@gighub.demo",
          role: "company"
        })
      ])
    );
    expect(response.body.data.readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "database"
        }),
        expect.objectContaining({
          name: "redis"
        })
      ])
    );
  });
});
