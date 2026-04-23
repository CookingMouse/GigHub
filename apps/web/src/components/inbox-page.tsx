"use client";

import type { PublicUser } from "@gighub/shared";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, inboxApi } from "@/lib/api";
import { WorkspaceLayout } from "./workspace-layout";

type InboxPageProps = {
  user: PublicUser;
};

export const InboxPage = ({ user }: InboxPageProps) => {
  const [threads, setThreads] = useState<Awaited<ReturnType<typeof inboxApi.listThreads>>["threads"]>([]);
  const [notifications, setNotifications] = useState<
    Awaited<ReturnType<typeof inboxApi.listNotifications>>["notifications"]
  >([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Awaited<ReturnType<typeof inboxApi.listMessages>>["messages"]
  >([]);
  const [messageBody, setMessageBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [threadsData, notificationsData] = await Promise.all([
        inboxApi.listThreads(),
        inboxApi.listNotifications()
      ]);
      setThreads(threadsData.threads);
      setNotifications(notificationsData.notifications);
      if (!activeThreadId && threadsData.threads.length > 0) {
        setActiveThreadId(threadsData.threads[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof ApiRequestError ? loadError.message : "Unable to load inbox.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await inboxApi.listMessages(activeThreadId);
        setMessages(response.messages);
        await inboxApi.markThreadRead(activeThreadId);
      } catch (loadError) {
        setError(loadError instanceof ApiRequestError ? loadError.message : "Unable to load messages.");
      }
    };

    void loadMessages();
  }, [activeThreadId]);

  const send = () => {
    if (!activeThreadId || !messageBody.trim()) {
      return;
    }

    startTransition(async () => {
      try {
        await inboxApi.createMessage(activeThreadId, { body: messageBody.trim() });
        setMessageBody("");
        const response = await inboxApi.listMessages(activeThreadId);
        setMessages(response.messages);
      } catch (sendError) {
        setError(sendError instanceof ApiRequestError ? sendError.message : "Unable to send message.");
      }
    });
  };

  return (
    <WorkspaceLayout
      title="Inbox"
      subtitle="Confirm job progress and communicate with your counterpart."
      user={user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      <div className="workspace-grid">
        <section className="inline-panel">
          <p className="eyebrow">Threads</p>
          <h2>Conversations</h2>
          <div className="card-stack">
            {threads.map((thread) => (
              <button
                className="button-secondary"
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                type="button"
              >
                {thread.subject ?? "Untitled thread"} ({thread.unreadCount})
              </button>
            ))}
          </div>
        </section>

        <section className="inline-panel">
          <p className="eyebrow">Messages</p>
          <h2>Progress updates</h2>
          <div className="card-stack">
            {messages.map((message) => (
              <article className="status-panel" key={message.id}>
                <strong>{message.senderName}</strong>
                <p>{message.body}</p>
              </article>
            ))}
          </div>
          <label className="field">
            <span>Send message</span>
            <textarea onChange={(event) => setMessageBody(event.target.value)} value={messageBody} />
          </label>
          <button className="button-primary" onClick={send} type="button">
            Send
          </button>
        </section>

        <section className="inline-panel">
          <p className="eyebrow">Notifications</p>
          <h2>Recent alerts</h2>
          <div className="card-stack">
            {notifications.map((notification) => (
              <article className="status-panel" key={notification.id}>
                <strong>{notification.title}</strong>
                <p>{notification.message ?? "No details."}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceLayout>
  );
};
