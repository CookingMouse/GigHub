import type {
  ConversationMessageRecord,
  ConversationThreadRecord,
  CreateConversationMessageInput,
  CreateConversationThreadInput,
  NotificationRecord
} from "@gighub/shared";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
const prismaAny = prisma as any;

const assertThreadParticipant = async (threadId: string, userId: string) => {
  const participant = await prismaAny.conversationParticipant.findFirst({
    where: {
      threadId,
      userId
    }
  });

  if (!participant) {
    throw new HttpError(403, "AUTH_FORBIDDEN", "You are not a participant in this conversation.");
  }
};

const ensureDueSoonNotifications = async (userId: string) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const milestones = await prisma.milestone.findMany({
    where: {
      dueAt: {
        gte: now,
        lte: horizon
      },
      status: {
        in: ["PENDING", "IN_PROGRESS", "REVISION_REQUESTED", "UNDER_REVIEW"]
      },
      job: {
        freelancerId: userId
      }
    },
    include: {
      job: true
    },
    take: 100
  });

  for (const milestone of milestones) {
    const title = `Milestone due soon (${milestone.id})`;
    const existing = await prisma.notification.findFirst({
      where: {
        recipientId: userId,
        type: "milestone.due_soon",
        title
      }
    });

    if (existing) {
      continue;
    }

    await prisma.notification.create({
      data: {
        recipientId: userId,
        type: "milestone.due_soon",
        title,
        message: `Milestone "${milestone.title}" is due on ${milestone.dueAt?.toISOString()}.`,
        payload: {
          milestoneId: milestone.id,
          jobId: milestone.jobId
        },
        deliveryStatus: "SENT",
        sentAt: new Date()
      }
    });
  }
};

export const listInboxThreads = async (userId: string): Promise<ConversationThreadRecord[]> => {
  await ensureDueSoonNotifications(userId);
  const participantRows = await prismaAny.conversationParticipant.findMany({
    where: {
      userId
    },
    include: {
      thread: {
        include: {
          participants: {
            include: {
              user: true
            }
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: "desc"
            },
            include: {
              sender: true
            }
          }
        }
      }
    },
    orderBy: {
      thread: {
        updatedAt: "desc"
      }
    }
  });

  return participantRows.map((row: any) => {
    const lastMessage = row.thread.messages[0] ?? null;
    const unreadCount = row.lastReadAt
      ? row.thread.messages.filter((message: any) => message.createdAt > row.lastReadAt!).length
      : row.thread.messages.length;

    return {
      id: row.thread.id,
      subject: row.thread.subject ?? null,
      jobId: row.thread.jobId ?? null,
      updatedAt: row.thread.updatedAt.toISOString(),
      participants: row.thread.participants.map((participant: any) => ({
        userId: participant.userId,
        name: participant.user.name,
        email: participant.user.email,
        role: participant.user.role
      })),
      lastMessage: lastMessage
        ? {
            senderName: lastMessage.sender.name,
            body: lastMessage.isEncrypted ? null : (lastMessage.body ?? null),
            isEncrypted: Boolean(lastMessage.isEncrypted),
            createdAt: lastMessage.createdAt.toISOString()
          }
        : null,
      unreadCount
    };
  });
};

export const createInboxThread = async (
  userId: string,
  input: CreateConversationThreadInput
): Promise<{ threadId: string }> => {
  const participantIds = Array.from(new Set([userId, ...input.participantIds]));
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: participantIds
      }
    }
  });

  if (users.length !== participantIds.length) {
    throw new HttpError(400, "INBOX_PARTICIPANT_INVALID", "One or more participants are invalid.");
  }

  if (input.jobId) {
    const job = await prisma.job.findUnique({
      where: {
        id: input.jobId
      }
    });

    if (!job) {
      throw new HttpError(404, "JOB_NOT_FOUND", "That job could not be found.");
    }
  }

  const thread = await prismaAny.conversationThread.create({
    data: {
      createdById: userId,
      subject: input.subject || null,
      jobId: input.jobId,
      participants: {
        create: participantIds.map((participantId) => ({
          userId: participantId
        }))
      }
    }
  });

  return {
    threadId: thread.id
  };
};

export const listThreadMessages = async (
  userId: string,
  threadId: string
): Promise<ConversationMessageRecord[]> => {
  await assertThreadParticipant(threadId, userId);

  const messages = await prismaAny.conversationMessage.findMany({
    where: {
      threadId
    },
    include: {
      sender: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return messages.map((message: any) => ({
    id: message.id,
    senderId: message.senderId,
    senderName: message.sender.name,
    body: message.isEncrypted ? null : (message.body ?? null),
    encryptedBody: message.encryptedBody ?? null,
    iv: message.iv ?? null,
    encryptedKeyForSender: message.encryptedKeyForSender ?? null,
    encryptedKeyForRecipient: message.encryptedKeyForRecipient ?? null,
    isEncrypted: Boolean(message.isEncrypted),
    createdAt: message.createdAt.toISOString()
  }));
};

export const createThreadMessage = async (
  userId: string,
  threadId: string,
  input: CreateConversationMessageInput
): Promise<{ messageId: string }> => {
  await assertThreadParticipant(threadId, userId);

  const message = await prismaAny.conversationMessage.create({
    data: {
      threadId,
      senderId: userId,
      body: input.isEncrypted ? null : input.body,
      encryptedBody: input.encryptedBody ?? null,
      iv: input.iv ?? null,
      encryptedKeyForSender: input.encryptedKeyForSender ?? null,
      encryptedKeyForRecipient: input.encryptedKeyForRecipient ?? null,
      isEncrypted: Boolean(input.isEncrypted)
    }
  });

  await prismaAny.conversationThread.update({
    where: {
      id: threadId
    },
    data: {
      updatedAt: new Date()
    }
  });

  const participants = await prismaAny.conversationParticipant.findMany({
    where: {
      threadId,
      userId: {
        not: userId
      }
    }
  });

  if (participants.length > 0) {
    await prisma.notification.createMany({
      data: participants.map((participant: any) => ({
        recipientId: participant.userId,
        type: "inbox.message",
        title: "New message",
        message: "You received a new message in inbox.",
        payload: {
          threadId,
          messageId: message.id
        },
        deliveryStatus: "SENT",
        sentAt: new Date()
      }))
    });
  }

  return {
    messageId: message.id
  };
};

export const markThreadRead = async (userId: string, threadId: string) => {
  await assertThreadParticipant(threadId, userId);

  await prismaAny.conversationParticipant.updateMany({
    where: {
      threadId,
      userId
    },
    data: {
      lastReadAt: new Date()
    }
  });
};

export const listNotifications = async (userId: string): Promise<NotificationRecord[]> => {
  await ensureDueSoonNotifications(userId);
  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: userId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message ?? null,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString()
  }));
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: {
      id: notificationId
    }
  });

  if (!notification || notification.recipientId !== userId) {
    throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "That notification could not be found.");
  }

  await prisma.notification.update({
    where: {
      id: notificationId
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
};
