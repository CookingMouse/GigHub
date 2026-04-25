import { MilestoneStatus } from "@gighub/shared";

export interface MilestoneStatusConfig {
  icon: string;
  label: string;
  badge: string;
  color: string;
  backgroundColor: string;
}

export const milestoneStatusConfig: Record<MilestoneStatus, MilestoneStatusConfig> = {
  PENDING: {
    icon: "🔒",
    label: "Locked",
    badge: "locked",
    color: "#6B7280",
    backgroundColor: "#F3F4F6"
  },
  IN_PROGRESS: {
    icon: "✍️",
    label: "In Progress",
    badge: "in-progress",
    color: "#B45309",
    backgroundColor: "#FEF3C7"
  },
  SUBMITTED: {
    icon: "⏳",
    label: "Under Review",
    badge: "submitted",
    color: "#1D4ED8",
    backgroundColor: "#EFF6FF"
  },
  UNDER_REVIEW: {
    icon: "⏳",
    label: "Under Review",
    badge: "under-review",
    color: "#1D4ED8",
    backgroundColor: "#EFF6FF"
  },
  APPROVED: {
    icon: "✅",
    label: "Approved",
    badge: "approved",
    color: "#0F6E56",
    backgroundColor: "#E1F5EE"
  },
  RELEASED: {
    icon: "✅",
    label: "Released",
    badge: "released",
    color: "#0F6E56",
    backgroundColor: "#E1F5EE"
  },
  DISPUTED: {
    icon: "⚠️",
    label: "Disputed",
    badge: "disputed",
    color: "#DC2626",
    backgroundColor: "#FEF2F2"
  },
  REVISION_REQUESTED: {
    icon: "✏️",
    label: "Revision Requested",
    badge: "revision-requested",
    color: "#B45309",
    backgroundColor: "#FEF3C7"
  }
};

/**
 * Calculate time remaining until auto-release (72 hours from submission)
 */
export const calculateTimeRemaining = (submittedAt: Date | string): {
  isExpired: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  formattedTime: string;
  expiresAt: Date;
} => {
  const submitted = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
  const expiresAt = new Date(submitted.getTime() + 72 * 60 * 60 * 1000); // 72 hours
  const now = new Date();
  const timeRemaining = expiresAt.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return {
      isExpired: true,
      hoursRemaining: 0,
      minutesRemaining: 0,
      formattedTime: "Expired",
      expiresAt
    };
  }

  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const days = Math.floor(hoursRemaining / 24);
  const hours = hoursRemaining % 24;

  let formattedTime = "";
  if (days > 0) {
    formattedTime = `${days} day${days > 1 ? "s" : ""} ${hours}h`;
  } else {
    formattedTime = `${hours}h ${minutesRemaining}m`;
  }

  return {
    isExpired: false,
    hoursRemaining,
    minutesRemaining,
    formattedTime,
    expiresAt
  };
};

/**
 * Format a date for display
 */
export const formatDate = (date: Date | string | null): string => {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(d);
};

/**
 * Get milestone progress percentage
 */
export const getMilestoneProgress = (currentIndex: number, totalMilestones: number): number => {
  return Math.round(((currentIndex + 1) / totalMilestones) * 100);
};

/**
 * Determine if milestone is locked (can't interact with it)
 */
export const isMilestoneLocked = (status: MilestoneStatus): boolean => {
  const locked = ["PENDING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISPUTED"].includes(status);

  return locked;
};

