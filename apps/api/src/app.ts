import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { randomUUID } from "crypto";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { freelancerRouter } from "./routes/freelancer";
import { freelancersRouter } from "./routes/freelancers";
import { healthRouter } from "./routes/health";
import { incomeStatementsRouter } from "./routes/income-statements";
import { inboxRouter } from "./routes/inbox";
import { jobsRouter } from "./routes/jobs";
import { paymentWebhooksRouter } from "./routes/payment-webhooks";
import { profileRouter } from "./routes/profile";
import { requestsRouter } from "./routes/requests";
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
app.use("/api/v1/freelancer", freelancerRouter);
app.use("/api/v1/freelancers", freelancersRouter);
app.use("/api/v1/income-statements", incomeStatementsRouter);
app.use("/api/v1/inbox", inboxRouter);
app.use("/api/v1/jobs", jobsRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/requests", requestsRouter);
app.use("/api/v1/webhooks/payments", paymentWebhooksRouter);

app.use(notFoundHandler);
app.use(errorHandler);
