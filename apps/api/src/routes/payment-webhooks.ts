import { Router } from "express";
import { mockPaymentWebhookSchema } from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { handleMockPaymentWebhook } from "../services/job-service";

export const paymentWebhooksRouter = Router();

paymentWebhooksRouter.post(
  "/mock",
  asyncHandler(async (request, response) => {
    const input = mockPaymentWebhookSchema.parse(request.body);
    const result = await handleMockPaymentWebhook(input);

    response.json({
      data: result
    });
  })
);
