"use client";

import type { PublicUser } from "@gighub/shared";
import React, { startTransition, useEffect, useRef, useState } from "react";
import { ApiRequestError, inboxApi } from "@/lib/api";
import { WorkspaceLayout } from "./workspace-layout";

type InboxPageProps = { user: PublicUser };

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  accent:      "#0F6E56",
  accentLight: "#E1F5EE",
  accentText:  "#085041",
  border:      "#E5E7EB",
  bg:          "#F9FAFB",
  card:        "#fff",
  text:        "#111827",
  sub:         "#6B7280",
  muted:       "#9CA3AF",
  danger:      "#DC2626",
  dangerLight: "#FEF2F2",
  warning:     "#B45309",
  warningLight:"#FEF3C7",
  info:        "#1D4ED8",
  infoLight:   "#EFF6FF",
};

// ── SVG icons ─────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  chat:    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  bell:    "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  updates: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  send:    "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
  search:  "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  attach:  "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  checks:  "M18 6L7 17l-5-5 M23 6L12 17",
};

type Tab = "chats" | "updates" | "alerts";

const TABS: { id: Tab; label: string; icon: keyof typeof ICONS }[] = [
  { id: "chats",   label: "Chats",   icon: "chat"    },
  { id: "updates", label: "Updates", icon: "updates" },
  { id: "alerts",  label: "Alerts",  icon: "bell"    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const avatarColors = ["#1D4ED8", "#7C3AED", "#B45309", "#DC2626", "#0F6E56"];
const getAvatarColor = (str: string) =>
  avatarColors[str.charCodeAt(0) % avatarColors.length];

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-MY", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)   return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 38 }: { name: string; size?: number }) => {
  const color = getAvatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0,
      background: color + "20", display: "flex", alignItems: "center",
      justifyContent: "center", border: `1.5px solid ${color}30`,
    }}>
      <span style={{ fontSize: size * 0.3, fontWeight: 700, color, fontFamily: "'DM Sans', sans-serif" }}>
        {getInitials(name)}
      </span>
    </div>
  );
};

// ── Notification type configs ─────────────────────────────────────────────────
const notifConfig: Record<string, { color: string; bg: string }> = {
  MILESTONE_SUBMITTED:  { color: T.info,    bg: T.infoLight    },
  PAYMENT_RELEASED:     { color: T.accent,  bg: T.accentLight  },
  MILESTONE_APPROVED:   { color: T.accent,  bg: T.accentLight  },
  MILESTONE_REJECTED:   { color: T.warning, bg: T.warningLight },
  DISPUTE_OPENED:       { color: T.danger,  bg: T.dangerLight  },
  DISPUTE_RESOLVED:     { color: T.accent,  bg: T.accentLight  },
  DEADLINE_REMINDER:    { color: T.warning, bg: T.warningLight },
  JOB_ASSIGNED:         { color: T.accent,  bg: T.accentLight  },
  ESCROW_FUNDED:        { color: T.accent,  bg: T.accentLight  },
  APPLICATION_ACCEPTED: { color: T.accent,  bg: T.accentLight  },
  APPLICATION_REJECTED: { color: T.danger,  bg: T.dangerLight  },
  DEFAULT:              { color: T.muted,   bg: "#F3F4F6"      },
};

const updateTypes = new Set([
  "MILESTONE_SUBMITTED", "PAYMENT_RELEASED", "MILESTONE_APPROVED",
  "MILESTONE_REJECTED", "ESCROW_FUNDED", "JOB_ASSIGNED",
]);

// ── Main component ────────────────────────────────────────────────────────────
export const InboxPage = ({ user }: InboxPageProps) => {
  type Thread = Awaited<ReturnType<typeof inboxApi.listThreads>>["threads"][number];
  type Msg    = Awaited<ReturnType<typeof inboxApi.listMessages>>["messages"][number];
  type Notif  = Awaited<ReturnType<typeof inboxApi.listNotifications>>["notifications"][number];

  const [tab, setTab]               = useState<Tab>("chats");
  const [threads, setThreads]       = useState<Thread[]>([]);
  const [selectedThread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [notifications, setNotifs]  = useState<Notif[]>([]);
  const [msgInput, setMsgInput]     = useState("");
  const [error, setError]           = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const [{ threads: thr }, { notifications: notifs }] = await Promise.all([
          inboxApi.listThreads(),
          inboxApi.listNotifications(),
        ]);
        setThreads(thr);
        setNotifs(notifs);
        if (thr.length > 0) setThread(thr[0]);
      } catch (e) {
        setError(e instanceof ApiRequestError ? e.message : "Unable to load inbox.");
      }
    };
    void load();
  }, []);

  // Load messages when selected thread changes
  useEffect(() => {
    if (!selectedThread) return;
    const load = async () => {
      try {
        const { messages: msgs } = await inboxApi.listMessages(selectedThread.id);
        setMessages(msgs);
        await inboxApi.markThreadRead(selectedThread.id);
      } catch (e) {
        setError(e instanceof ApiRequestError ? e.message : "Unable to load messages.");
      }
    };
    void load();
  }, [selectedThread?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!selectedThread || !msgInput.trim()) return;
    const body = msgInput.trim();
    setMsgInput("");
    startTransition(async () => {
      try {
        await inboxApi.createMessage(selectedThread.id, { body });
        const { messages: msgs } = await inboxApi.listMessages(selectedThread.id);
        setMessages(msgs);
      } catch (e) {
        setError(e instanceof ApiRequestError ? e.message : "Unable to send message.");
      }
    });
  };

  const updateNotifs = notifications.filter(n => updateTypes.has(n.type));
  const alertNotifs  = notifications.filter(n => !updateTypes.has(n.type));

  const unreadChats   = threads.reduce((s, t) => s + (t.unreadCount ?? 0), 0);
  const unreadUpdates = updateNotifs.filter(n => !n.isRead).length;
  const unreadAlerts  = alertNotifs.filter(n => !n.isRead).length;

  const tabBadge: Record<Tab, number> = {
    chats:   unreadChats,
    updates: unreadUpdates,
    alerts:  unreadAlerts,
  };

  return (
    <WorkspaceLayout title="Inbox" subtitle="Messages, milestone updates, and platform alerts." user={user}>
      {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}

      {/* ── Inbox container ── */}
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: 16,
        background: T.card, overflow: "hidden",
        display: "flex", height: "calc(100vh - 220px)", minHeight: 520,
      }}>

        {/* ── Left sidebar ── */}
        <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 2, padding: "12px 12px 0", borderBottom: `1px solid ${T.border}` }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} type="button" style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, padding: "8px 4px 10px",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`,
                transition: "border-color 0.15s", position: "relative",
              }}>
                <div style={{ position: "relative" }}>
                  <span style={{ color: tab === t.id ? T.accent : T.muted }}>
                    <Icon d={ICONS[t.icon]} size={17} />
                  </span>
                  {tabBadge[t.id] > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -7,
                      minWidth: 14, height: 14, borderRadius: 99,
                      background: T.danger, color: "#fff",
                      fontSize: 8, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", border: "1.5px solid #fff",
                    }}>
                      {tabBadge[t.id]}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: tab === t.id ? T.accentText : T.muted, letterSpacing: "0.04em" }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Search (chats only) */}
          {tab === "chats" && (
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                background: T.bg, border: `1px solid ${T.border}`,
                borderRadius: 9, padding: "7px 11px",
              }}>
                <span style={{ color: T.muted }}><Icon d={ICONS.search} size={13} /></span>
                <input placeholder="Search conversations..." style={{
                  border: "none", background: "none", outline: "none",
                  fontSize: 12.5, color: T.text, width: "100%",
                  fontFamily: "'DM Sans', sans-serif",
                }} />
              </div>
            </div>
          )}

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>

            {/* Chats list */}
            {tab === "chats" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px" }}>
                {threads.length === 0 && (
                  <p style={{ fontSize: 13, color: T.muted, padding: "16px 8px", margin: 0 }}>No conversations yet.</p>
                )}
                {threads.map(thread => {
                  const isSelected = selectedThread?.id === thread.id;
                  const displayName = thread.subject ?? "Conversation";
                  return (
                    <div key={thread.id} onClick={() => setThread(thread)} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 12, cursor: "pointer",
                      background: isSelected ? T.accentLight : "transparent",
                      border: `1px solid ${isSelected ? T.accent + "30" : "transparent"}`,
                      transition: "background 0.12s",
                    }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = T.bg; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Avatar name={displayName} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <p style={{ fontSize: 13, fontWeight: (thread.unreadCount ?? 0) > 0 ? 700 : 500, color: T.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                            {displayName}
                          </p>
                        </div>
                        <p style={{ fontSize: 12, color: T.sub, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: (thread.unreadCount ?? 0) > 0 ? 500 : 400 }}>
                          {thread.lastMessage ?? "No messages yet"}
                        </p>
                      </div>
                      {(thread.unreadCount ?? 0) > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 99,
                          background: T.accent, color: "#fff",
                          fontSize: 10, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 5px", flexShrink: 0,
                        }}>
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Updates list */}
            {tab === "updates" && (
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.sub, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Milestone & Escrow Updates
                </p>
                {updateNotifs.length === 0 && (
                  <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No updates yet.</p>
                )}
                {updateNotifs.map(n => {
                  const cfg = notifConfig[n.type] ?? notifConfig.DEFAULT;
                  return (
                    <div key={n.id} style={{
                      border: `1px solid ${n.isRead ? T.border : cfg.color + "40"}`,
                      borderLeft: `3px solid ${cfg.color}`,
                      borderRadius: 12, padding: "12px 14px",
                      background: n.isRead ? T.card : cfg.bg,
                      opacity: n.isRead ? 0.8 : 1,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                        {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: 99, background: cfg.color, display: "inline-block", flexShrink: 0, marginTop: 4 }} />}
                      </div>
                      <p style={{ fontSize: 12, color: T.sub, margin: 0, lineHeight: 1.5 }}>{n.message ?? ""}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alerts list */}
            {tab === "alerts" && (
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.sub, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Recent Alerts
                </p>
                {alertNotifs.length === 0 && (
                  <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No alerts.</p>
                )}
                {alertNotifs.map(n => {
                  const cfg = notifConfig[n.type] ?? notifConfig.DEFAULT;
                  return (
                    <div key={n.id} style={{
                      border: `1px solid ${n.isRead ? T.border : cfg.color + "40"}`,
                      borderLeft: `3px solid ${n.isRead ? T.border : cfg.color}`,
                      borderRadius: 12, padding: "12px 14px",
                      background: n.isRead ? T.card : cfg.bg,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                        <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {n.createdAt ? formatRelative(n.createdAt) : ""}
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: T.sub, margin: 0, lineHeight: 1.5 }}>{n.message ?? ""}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Chat view */}
          {tab === "chats" && selectedThread && (
            <>
              {/* Chat header */}
              <div style={{
                padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
                background: T.card,
              }}>
                <Avatar name={selectedThread.subject ?? "Conversation"} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>
                    {selectedThread.subject ?? "Conversation"}
                  </p>
                  <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                    {selectedThread.participantCount ?? 0} participant(s)
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.length === 0 && (
                  <p style={{ fontSize: 13, color: T.muted, textAlign: "center", marginTop: 32 }}>
                    No messages in this conversation yet.
                  </p>
                )}
                {messages.map(msg => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "72%" }}>
                        {!isMe && (
                          <p style={{ fontSize: 11, color: T.muted, margin: "0 0 4px" }}>{msg.senderName}</p>
                        )}
                        <div style={{
                          padding: "10px 14px",
                          borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          background: isMe ? T.accent : T.bg,
                          border: isMe ? "none" : `1px solid ${T.border}`,
                          color: isMe ? "#fff" : T.text,
                          fontSize: 13.5, lineHeight: 1.55,
                        }}>
                          {msg.body}
                        </div>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 4,
                          justifyContent: isMe ? "flex-end" : "flex-start",
                          marginTop: 4,
                        }}>
                          <span style={{ fontSize: 11, color: T.muted }}>
                            {msg.createdAt ? formatTime(msg.createdAt) : ""}
                          </span>
                          {isMe && <Icon d={ICONS.checks} size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: "14px 16px", borderTop: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
                background: T.card,
              }}>
                <button type="button" style={{
                  width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.border}`,
                  background: T.bg, display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", color: T.muted, flexShrink: 0,
                }}>
                  <Icon d={ICONS.attach} size={15} />
                </button>
                <input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Type a message..."
                  style={{
                    flex: 1, border: `1px solid ${T.border}`, borderRadius: 10,
                    padding: "9px 14px", fontSize: 13.5, outline: "none",
                    background: T.bg, color: T.text,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <button onClick={send} type="button" style={{
                  width: 36, height: 36, borderRadius: 10, border: "none",
                  background: msgInput.trim() ? T.accent : T.border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: msgInput.trim() ? "pointer" : "default",
                  color: msgInput.trim() ? "#fff" : T.muted,
                  transition: "background 0.15s", flexShrink: 0,
                }}>
                  <Icon d={ICONS.send} size={15} />
                </button>
              </div>
            </>
          )}

          {/* No thread selected */}
          {tab === "chats" && !selectedThread && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>
              <div style={{ textAlign: "center" }}>
                <Icon d={ICONS.chat} size={36} />
                <p style={{ fontSize: 14, marginTop: 12 }}>Select a conversation</p>
              </div>
            </div>
          )}

          {/* Updates / Alerts empty right panel */}
          {(tab === "updates" || tab === "alerts") && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: T.muted, gap: 8, padding: 32,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: T.bg, border: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon d={tab === "updates" ? ICONS.updates : ICONS.bell} size={24} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.sub, margin: 0 }}>
                {tab === "updates" ? "Milestone & escrow updates appear on the left" : "Platform alerts appear on the left"}
              </p>
              <p style={{ fontSize: 12, color: T.muted, margin: 0, textAlign: "center", maxWidth: 280 }}>
                {tab === "updates"
                  ? "Updates are automatically generated when milestones are submitted, approved, or payments are released."
                  : "Alerts are sent for disputes, deadlines, escrow events, and GLM decisions."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
