import { Router } from "express";
import {
  createConversationMessageSchema,
  createConversationThreadSchema
} from "@gighub/shared";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import {
  createInboxThread,
  createThreadMessage,
  listInboxThreads,
  listNotifications,
  listThreadMessages,
  markNotificationRead,
  markThreadRead
} from "../services/inbox-service";

export const inboxRouter = Router();

inboxRouter.use(requireAuth);
const readParam = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

inboxRouter.get(
  "/threads",
  asyncHandler(async (request, response) => {
    const threads = await listInboxThreads(request.auth!.userId);

    response.json({
      data: {
        threads
      }
    });
  })
);

inboxRouter.post(
  "/threads",
  asyncHandler(async (request, response) => {
    const input = createConversationThreadSchema.parse(request.body);
    const result = await createInboxThread(request.auth!.userId, input);

    response.status(201).json({
      data: result
    });
  })
);

inboxRouter.get(
  "/threads/:threadId/messages",
  asyncHandler(async (request, response) => {
    const messages = await listThreadMessages(request.auth!.userId, readParam(request.params.threadId));

    response.json({
      data: {
        messages
      }
    });
  })
);

inboxRouter.post(
  "/threads/:threadId/messages",
  asyncHandler(async (request, response) => {
    const input = createConversationMessageSchema.parse(request.body);
    const result = await createThreadMessage(
      request.auth!.userId,
      readParam(request.params.threadId),
      input
    );

    response.status(201).json({
      data: result
    });
  })
);

inboxRouter.post(
  "/threads/:threadId/read",
  asyncHandler(async (request, response) => {
    await markThreadRead(request.auth!.userId, readParam(request.params.threadId));

    response.json({
      data: {
        success: true
      }
    });
  })
);

inboxRouter.get(
  "/notifications",
  asyncHandler(async (request, response) => {
    const notifications = await listNotifications(request.auth!.userId);

    response.json({
      data: {
        notifications
      }
    });
  })
);

inboxRouter.post(
  "/notifications/:notificationId/read",
  asyncHandler(async (request, response) => {
    await markNotificationRead(request.auth!.userId, readParam(request.params.notificationId));

    response.json({
      data: {
        success: true
      }
    });
  })
);
