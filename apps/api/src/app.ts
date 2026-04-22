import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { randomUUID } from "crypto";
import { env } from "./lib/env";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { jobsRouter } from "./routes/jobs";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";

export const app = express();

app.use((request, response, next) => {
  request.requestId = randomUUID();
  response.setHeader("x-request-id", request.requestId);
  next();
});

app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/jobs", jobsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
