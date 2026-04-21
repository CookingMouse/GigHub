import type { AppRole } from "@gighub/shared";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        role: AppRole;
        sessionId?: string;
      };
    }
  }
}

export {};

