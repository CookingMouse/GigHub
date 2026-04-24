import { useState, useRef, useEffect } from "react";

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  progress: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  send:     "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
  search:   "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  check:    "M20 6L9 17l-5-5",
  checks:   "M18 6L7 17l-5-5 M23 6L12 17",
  clock:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  file:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  alert:    "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  money:    "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  glm:      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M8 12h8 M12 8v8",
  attach:   "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  close:    "M18 6L6 18 M6 6l12 12",
  dispute:  "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

// ── Design tokens (matching platform) ───────────────────────────────────────
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

// ── Mock data ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "chats",    label: "Chats",    icon: "chat",     badge: 3 },
  { id: "progress", label: "Updates",  icon: "progress", badge: 2 },
  { id: "alerts",   label: "Alerts",   icon: "bell",     badge: 5 },
];

const conversations = [
  {
    id: "c1",
    name: "TechCorp Sdn Bhd",
    jobTitle: "UI Redesign — Dashboard",
    avatar: "TC",
    avatarColor: T.info,
    lastMsg: "Can you make the header sticky on scroll?",
    time: "2m ago",
    unread: 2,
    online: true,
    messages: [
      { id: 1, from: "them", text: "Hi Ahmad, thanks for accepting the job! Just wanted to go over the brief before you start.", time: "10:02 AM", date: "Today" },
      { id: 2, from: "me",   text: "Of course! I've read through the brief already. The main dashboard redesign seems straightforward. I have a few questions about the component library — are you using an existing one or starting fresh?", time: "10:05 AM", date: "Today" },
      { id: 3, from: "them", text: "We're using shadcn/ui as the base but we want a custom look on top. Full creative freedom on colors and layout.", time: "10:07 AM", date: "Today" },
      { id: 4, from: "me",   text: "Perfect, that works well. I'll prepare the wireframes for Milestone 1 first so you can validate the direction before I go high-fidelity.", time: "10:09 AM", date: "Today" },
      { id: 5, from: "them", text: "Sounds good. One more thing — can you make the header sticky on scroll?", time: "10:14 AM", date: "Today" },
    ],
  },
  {
    id: "c2",
    name: "StartX Technologies",
    jobTitle: "API Integration — Payments",
    avatar: "SX",
    avatarColor: "#7C3AED",
    lastMsg: "Milestone 1 looks great, approved!",
    time: "1h ago",
    unread: 0,
    online: false,
    messages: [
      { id: 1, from: "them", text: "Hey, just reviewed your Milestone 1 submission. The auth endpoints are clean.", time: "9:00 AM", date: "Today" },
      { id: 2, from: "me",   text: "Thanks! I tested it against your staging environment. Everything passes. Ready to move to Milestone 2.", time: "9:15 AM", date: "Today" },
      { id: 3, from: "them", text: "Milestone 1 looks great, approved! Escrow released.", time: "9:30 AM", date: "Today" },
    ],
  },
  {
    id: "c3",
    name: "FinanceY",
    jobTitle: "Dashboard Build",
    avatar: "FY",
    avatarColor: T.warning,
    lastMsg: "We need the charts by Friday please",
    time: "3h ago",
    unread: 1,
    online: true,
    messages: [
      { id: 1, from: "them", text: "Ahmad, quick update — the CFO wants the revenue charts added to the scope.", time: "8:00 AM", date: "Today" },
      { id: 2, from: "me",   text: "That wasn't in the original brief. Can we discuss adding it as a new milestone?", time: "8:20 AM", date: "Today" },
      { id: 3, from: "them", text: "We need the charts by Friday please", time: "8:45 AM", date: "Today" },
    ],
  },
];

const progressUpdates = [
  {
    id: "p1",
    jobTitle: "UI Redesign — Dashboard",
    company: "TechCorp Sdn Bhd",
    type: "SUBMISSION",
    milestone: "M2 — High-Fidelity Mockups",
    message: "Your submission has been received. GLM brief-match score: 74/100. Client has 72 hours to review.",
    time: "2 hours ago",
    read: false,
    glmScore: 74,
    glmColor: T.warning,
  },
  {
    id: "p2",
    jobTitle: "API Integration — Payments",
    company: "StartX Technologies",
    type: "RELEASED",
    milestone: "M1 — Environment Setup & Auth",
    message: "RM 800 has been released to your wallet. Client approved your submission.",
    time: "3 hours ago",
    read: false,
    amount: 800,
  },
  {
    id: "p3",
    jobTitle: "UI Redesign — Dashboard",
    company: "TechCorp Sdn Bhd",
    type: "MILESTONE_UNLOCK",
    milestone: "M3 — Design System & Handoff",
    message: "Milestone 3 is now unlocked and available once Milestone 2 is approved.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "p4",
    jobTitle: "Dashboard Build",
    company: "FinanceY",
    type: "AUTORELEASE",
    milestone: "M1 — Initial Layout",
    message: "72-hour review window expired. RM 1,200 automatically released to your wallet.",
    time: "2 days ago",
    read: true,
    amount: 1200,
  },
];

const alerts = [
  {
    id: "a1",
    type: "DISPUTE",
    title: "Dispute raised on your submission",
    body: "TechCorp has raised a dispute on Milestone 2. GLM is analysing both sides. Expected ruling within 24 hours.",
    time: "30 min ago",
    read: false,
    severity: "high",
  },
  {
    id: "a2",
    type: "DEADLINE",
    title: "Milestone due in 2 days",
    body: "M2 — Payment Flow Implementation for StartX Technologies is due on 30 Apr 2026.",
    time: "1 hour ago",
    read: false,
    severity: "medium",
  },
  {
    id: "a3",
    type: "ESCROW",
    title: "Escrow funded for new job",
    body: "FinanceY has funded the escrow for Dashboard Build (RM 3,200). You can now begin work.",
    time: "5 hours ago",
    read: false,
    severity: "low",
  },
  {
    id: "a4",
    type: "GLM",
    title: "GLM brief analysis complete",
    body: "Your job brief for TechCorp has been analysed. Score: 74/100. 2 issues flagged — missing mobile breakpoint spec and dark mode variant.",
    time: "Yesterday",
    read: true,
    severity: "medium",
  },
  {
    id: "a5",
    type: "PLATFORM",
    title: "Income statement ready",
    body: "Your Jan–Apr 2026 income statement has been generated and is ready to download.",
    time: "2 days ago",
    read: true,
    severity: "low",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const Avatar = ({ initials, color, size = 38, online = false }) => (
  <div style={{ position: "relative", flexShrink: 0 }}>
    <div style={{
      width: size, height: size, borderRadius: 99,
      background: color + "20", display: "flex",
      alignItems: "center", justifyContent: "center",
      border: `1.5px solid ${color}30`,
    }}>
      <span style={{ fontSize: size * 0.3, fontWeight: 700, color, fontFamily: "'DM Sans', sans-serif" }}>
        {initials}
      </span>
    </div>
    {online && (
      <span style={{
        position: "absolute", bottom: 1, right: 1,
        width: 9, height: 9, borderRadius: 99,
        background: "#22C55E", border: "2px solid #fff",
      }} />
    )}
  </div>
);

const progressTypeCfg = {
  SUBMISSION:       { icon: "file",    color: T.info,    bg: T.infoLight,    label: "Submitted"     },
  RELEASED:         { icon: "money",   color: T.accent,  bg: T.accentLight,  label: "Payment"       },
  MILESTONE_UNLOCK: { icon: "star",    color: T.warning, bg: T.warningLight, label: "Unlocked"      },
  AUTORELEASE:      { icon: "clock",   color: T.accent,  bg: T.accentLight,  label: "Auto-Released" },
};

const alertTypeCfg = {
  DISPUTE:  { icon: "dispute", color: T.danger,  bg: T.dangerLight  },
  DEADLINE: { icon: "clock",   color: T.warning, bg: T.warningLight },
  ESCROW:   { icon: "shield",  color: T.accent,  bg: T.accentLight  },
  GLM:      { icon: "glm",     color: T.info,    bg: T.infoLight    },
  PLATFORM: { icon: "bell",    color: T.muted,   bg: "#F3F4F6"      },
};

// ── Chat panel ───────────────────────────────────────────────────────────────
const ChatPanel = ({ conv }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(conv.messages);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages(conv.messages);
    setInput("");
  }, [conv.id]);

  const send = () => {
    if (!input.trim()) return;
    setMessages(m => [...m, {
      id: Date.now(), from: "me", text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: "Today",
    }]);
    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Chat header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        background: T.card,
      }}>
        <Avatar initials={conv.avatar} color={conv.avatarColor} online={conv.online} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{conv.name}</p>
          <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>{conv.jobTitle}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
          background: conv.online ? "#DCFCE7" : "#F3F4F6",
          color: conv.online ? "#15803D" : T.muted,
        }}>
          {conv.online ? "Online" : "Offline"}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => {
          const isMe = msg.from === "me";
          const showDate = i === 0 || messages[i - 1].date !== msg.date;
          return (
            <div key={msg.id}>
              {showDate && (
                <div style={{ textAlign: "center", margin: "8px 0" }}>
                  <span style={{ fontSize: 11, color: T.muted, background: T.bg, padding: "3px 12px", borderRadius: 99, border: `1px solid ${T.border}` }}>
                    {msg.date}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "72%" }}>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMe ? T.accent : T.bg,
                    border: isMe ? "none" : `1px solid ${T.border}`,
                    color: isMe ? "#fff" : T.text,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    marginTop: 4,
                  }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{msg.time}</span>
                    {isMe && <Icon d={icons.checks} size={12} />}
                  </div>
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
        <button style={{
          width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.border}`,
          background: T.bg, display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", color: T.muted, flexShrink: 0,
        }}>
          <Icon d={icons.attach} size={15} />
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Type a message..."
          style={{
            flex: 1, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: "9px 14px", fontSize: 13.5, outline: "none",
            background: T.bg, color: T.text,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button
          onClick={send}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            background: input.trim() ? T.accent : T.border,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() ? "pointer" : "default",
            color: input.trim() ? "#fff" : T.muted,
            transition: "background 0.15s", flexShrink: 0,
          }}>
          <Icon d={icons.send} size={15} />
        </button>
      </div>
    </div>
  );
};

// ── Progress updates panel ───────────────────────────────────────────────────
const ProgressPanel = () => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: T.sub, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Milestone & Escrow Updates
      </p>
    </div>
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {progressUpdates.map(u => {
        const cfg = progressTypeCfg[u.type];
        return (
          <div key={u.id} style={{
            border: `1px solid ${u.read ? T.border : cfg.color + "40"}`,
            borderLeft: `3px solid ${cfg.color}`,
            borderRadius: 12, padding: "14px 16px",
            background: u.read ? T.card : cfg.bg,
            opacity: u.read ? 0.8 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: cfg.color + "15", display: "flex",
                alignItems: "center", justifyContent: "center", color: cfg.color,
              }}>
                <Icon d={icons[cfg.icon]} size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: cfg.color + "15", color: cfg.color,
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted }}>{u.time}</span>
                  {!u.read && (
                    <span style={{
                      width: 7, height: 7, borderRadius: 99,
                      background: cfg.color, display: "inline-block",
                    }} />
                  )}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 2px" }}>{u.milestone}</p>
                <p style={{ fontSize: 11, color: T.sub, margin: "0 0 6px" }}>{u.jobTitle} · {u.company}</p>
                <p style={{ fontSize: 12.5, color: T.text, margin: 0, lineHeight: 1.5 }}>{u.message}</p>
                {u.glmScore && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 5, background: "#E5E7EB", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${u.glmScore}%`, height: "100%", background: u.glmColor, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: u.glmColor, fontFamily: "'DM Mono', monospace" }}>
                      {u.glmScore}/100
                    </span>
                  </div>
                )}
                {u.amount && (
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.accent, margin: "6px 0 0", fontFamily: "'DM Mono', monospace" }}>
                    + RM {u.amount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Alerts panel ─────────────────────────────────────────────────────────────
const AlertsPanel = () => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: T.sub, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Recent Alerts
      </p>
    </div>
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {alerts.map(a => {
        const cfg = alertTypeCfg[a.type];
        return (
          <div key={a.id} style={{
            border: `1px solid ${a.read ? T.border : cfg.color + "40"}`,
            borderLeft: `3px solid ${a.read ? T.border : cfg.color}`,
            borderRadius: 12, padding: "14px 16px",
            background: a.read ? T.card : cfg.bg,
          }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: cfg.color + "15", display: "flex",
                alignItems: "center", justifyContent: "center", color: cfg.color,
              }}>
                <Icon d={icons[cfg.icon]} size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0, lineHeight: 1.3 }}>{a.title}</p>
                  <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", flexShrink: 0 }}>{a.time}</span>
                </div>
                <p style={{ fontSize: 12.5, color: T.sub, margin: 0, lineHeight: 1.5 }}>{a.body}</p>
                {!a.read && a.type === "DISPUTE" && (
                  <button style={{
                    marginTop: 10, fontSize: 12, fontWeight: 600,
                    color: "#fff", background: T.danger, border: "none",
                    borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                  }}>
                    View Dispute →
                  </button>
                )}
                {!a.read && a.type === "DEADLINE" && (
                  <button style={{
                    marginTop: 10, fontSize: 12, fontWeight: 600,
                    color: T.warning, background: T.warningLight, border: `1px solid ${T.warning}30`,
                    borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                  }}>
                    View Milestone →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Conversation list ────────────────────────────────────────────────────────
const ConvList = ({ selected, onSelect }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px" }}>
    {conversations.map(c => (
      <div
        key={c.id}
        onClick={() => onSelect(c)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 12px", borderRadius: 12, cursor: "pointer",
          background: selected?.id === c.id ? T.accentLight : "transparent",
          border: `1px solid ${selected?.id === c.id ? T.accent + "30" : "transparent"}`,
          transition: "background 0.12s",
        }}
        onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = T.bg; }}
        onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = "transparent"; }}
      >
        <Avatar initials={c.avatar} color={c.avatarColor} online={c.online} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <p style={{ fontSize: 13, fontWeight: c.unread > 0 ? 700 : 500, color: T.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
              {c.name}
            </p>
            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{c.time}</span>
          </div>
          <p style={{ fontSize: 11, color: T.muted, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {c.jobTitle}
          </p>
          <p style={{ fontSize: 12, color: c.unread > 0 ? T.text : T.sub, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: c.unread > 0 ? 500 : 400 }}>
            {c.lastMsg}
          </p>
        </div>
        {c.unread > 0 && (
          <span style={{
            minWidth: 18, height: 18, borderRadius: 99,
            background: T.accent, color: "#fff",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px", flexShrink: 0,
          }}>
            {c.unread}
          </span>
        )}
      </div>
    ))}
  </div>
);

// ── Main inbox page ──────────────────────────────────────────────────────────
export default function InboxPage() {
  const [tab, setTab]             = useState("chats");
  const [selectedConv, setConv]   = useState(conversations[0]);

  const totalUnread = TABS.reduce((s, t) => s + t.badge, 0);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: T.text, margin: 0, letterSpacing: "-0.3px" }}>
            Inbox
          </h1>
          {totalUnread > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "2px 10px",
              borderRadius: 99, background: T.dangerLight, color: T.danger,
            }}>
              {totalUnread} unread
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: T.sub, margin: "4px 0 0" }}>
          Messages, milestone updates, and platform alerts.
        </p>
      </div>

      {/* Inbox container */}
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: 16,
        background: T.card, overflow: "hidden",
        display: "flex", height: "calc(100vh - 200px)", minHeight: 520,
      }}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 280, flexShrink: 0, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column",
        }}>

          {/* Tab switcher */}
          <div style={{
            display: "flex", gap: 2, padding: "12px 12px 0",
            borderBottom: `1px solid ${T.border}`,
          }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4, padding: "8px 4px 10px",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`,
                transition: "border-color 0.15s",
                position: "relative",
              }}>
                <div style={{ position: "relative" }}>
                  <span style={{ color: tab === t.id ? T.accent : T.muted }}>
                    <Icon d={icons[t.icon]} size={17} />
                  </span>
                  {t.badge > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -7,
                      minWidth: 14, height: 14, borderRadius: 99,
                      background: T.danger, color: "#fff",
                      fontSize: 8, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", border: "1.5px solid #fff",
                    }}>
                      {t.badge}
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
                <span style={{ color: T.muted }}><Icon d={icons.search} size={13} /></span>
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
            {tab === "chats" && (
              <ConvList selected={selectedConv} onSelect={setConv} />
            )}
            {tab === "progress" && <ProgressPanel />}
            {tab === "alerts"   && <AlertsPanel />}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tab === "chats" ? (
            selectedConv
              ? <ChatPanel conv={selectedConv} key={selectedConv.id} />
              : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>
                  <div style={{ textAlign: "center" }}>
                    <Icon d={icons.chat} size={36} />
                    <p style={{ fontSize: 14, marginTop: 12 }}>Select a conversation</p>
                  </div>
                </div>
              )
          ) : (
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
                <Icon d={tab === "progress" ? icons.progress : icons.bell} size={24} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.sub, margin: 0 }}>
                {tab === "progress" ? "Milestone & escrow updates appear on the left" : "Platform alerts appear on the left"}
              </p>
              <p style={{ fontSize: 12, color: T.muted, margin: 0, textAlign: "center", maxWidth: 280 }}>
                {tab === "progress"
                  ? "Updates are automatically generated when milestones are submitted, approved, or payments are released."
                  : "Alerts are sent for disputes, deadlines, escrow events, and GLM decisions."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
