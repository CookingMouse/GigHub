import { randomUUID } from "crypto";
import type { MockPaymentIntentRecord } from "@gighub/shared";

type CreateMockPaymentIntentInput = {
  amount: number;
};

export const mockPaymentProvider = {
  createIntent(input: CreateMockPaymentIntentInput): MockPaymentIntentRecord {
    return {
      intentId: `mock_intent_${randomUUID().replace(/-/g, "")}`,
      amount: input.amount,
      currency: "MYR",
      provider: "mock",
      status: "requires_confirmation"
    };
  }
};
