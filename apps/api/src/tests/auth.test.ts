import request from "supertest";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { app } from "../app";

describe("auth routes", () => {
  beforeAll(async () => {
    await prisma.$connect();

    if (!redis.isOpen) {
      await redis.connect();
    }
  });

  beforeEach(async () => {
    const sessionKeys = await redis.keys("session:*");

    if (sessionKeys.length > 0) {
      await redis.del(sessionKeys);
    }

    await prisma.companyProfile.deleteMany();
    await prisma.freelancerProfile.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.companyProfile.deleteMany();
    await prisma.freelancerProfile.deleteMany();
    await prisma.user.deleteMany();

    if (redis.isOpen) {
      await redis.quit();
    }

    await prisma.$disconnect();
  });

  it("registers a freelancer account", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Aina Musa",
      email: "aina@example.com",
      password: "StrongPass123",
      role: "freelancer"
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("freelancer");
    expect(response.body.data.user.name).toBe("Aina Musa");
    expect(response.headers["set-cookie"]).toBeTruthy();
  });

  it("registers a company account", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Kampung Labs",
      email: "hello@kampunglabs.my",
      password: "StrongPass123",
      role: "company"
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("company");
    expect(response.body.data.user.name).toBe("Kampung Labs");
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Aina Musa",
      email: "aina@example.com",
      password: "StrongPass123",
      role: "freelancer"
    });

    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Aina Musa",
      email: "aina@example.com",
      password: "StrongPass123",
      role: "freelancer"
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("AUTH_EMAIL_TAKEN");
  });

  it("logs in with valid credentials", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Aina Musa",
      email: "aina@example.com",
      password: "StrongPass123",
      role: "freelancer"
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "aina@example.com",
      password: "StrongPass123"
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("aina@example.com");
    expect(response.headers["set-cookie"]).toBeTruthy();
  });

  it("rejects invalid credentials", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Aina Musa",
      email: "aina@example.com",
      password: "StrongPass123",
      role: "freelancer"
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "aina@example.com",
      password: "WrongPassword123"
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("refreshes a valid session", async () => {
    const agent = request.agent(app);

    await agent.post("/api/v1/auth/register").send({
      name: "Aina Musa",
      email: "aina@example.com",
      password: "StrongPass123",
      role: "freelancer"
    });

    const response = await agent.post("/api/v1/auth/refresh");

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("aina@example.com");
  });

  it("rejects refresh without a session cookie", async () => {
    const response = await request(app).post("/api/v1/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_REQUIRED");
  });

  it("returns the current user for an authenticated session", async () => {
    const agent = request.agent(app);

    await agent.post("/api/v1/auth/register").send({
      name: "Aina Musa",
      email: "aina@example.com",
      password: "StrongPass123",
      role: "freelancer"
    });

    const response = await agent.get("/api/v1/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("aina@example.com");
  });

  it("rejects me when unauthenticated", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_REQUIRED");
  });
});
