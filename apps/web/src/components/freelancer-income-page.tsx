"use client";

import React from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { FreelancerIncomePanel } from "./freelancer-income-panel";
import { WorkspaceLayout } from "./workspace-layout";

export const FreelancerIncomePage = () => {
  const session = useProtectedUser("freelancer");

  if (session.status !== "ready") {
    return null;
  }

  return (
    <WorkspaceLayout
      title="Income Generator"
      subtitle="Generate a formal income statement for a selected period."
      user={session.user}
    >
      <FreelancerIncomePanel />
    </WorkspaceLayout>
  );
};
