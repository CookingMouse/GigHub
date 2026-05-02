"use client";

import { useProtectedUser } from "@/hooks/use-protected-user";
import { InboxPage } from "@/components/inbox-page";

export default function FreelancerInboxRoute() {
  const state = useProtectedUser("freelancer");

  if (state.status !== "ready") {
    return null;
  }

  return <InboxPage user={state.user} />;
}
