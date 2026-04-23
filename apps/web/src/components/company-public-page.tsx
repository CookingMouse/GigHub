"use client";

import React, { useEffect, useState } from "react";
import { ApiRequestError, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type CompanyPublicPageProps = {
  companyId: string;
};

export const CompanyPublicPage = ({ companyId }: CompanyPublicPageProps) => {
  const session = useProtectedUser();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; company: Awaited<ReturnType<typeof profileApi.getPublicCompanyProfile>>["company"] }
  >({ status: "loading" });

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    const load = async () => {
      try {
        const response = await profileApi.getPublicCompanyProfile(companyId);
        setState({
          status: "ready",
          company: response.company
        });
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof ApiRequestError ? error.message : "Unable to load company profile."
        });
      }
    };

    void load();
  }, [companyId, session.status]);

  if (session.status !== "ready") {
    return null;
  }

  return (
    <WorkspaceLayout
      title="Company page"
      subtitle="Public company details for freelancer review."
      user={session.user}
    >
      {state.status === "loading" ? <p className="muted">Loading company profile...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}
      {state.status === "ready" ? (
        <section className="inline-panel">
          <h2>{state.company.companyName}</h2>
          <p className="muted">{state.company.industry ?? "No industry listed."}</p>
          <p>{state.company.about ?? "No company introduction yet."}</p>
          <p className="muted">{state.company.website ?? "No website listed."}</p>
        </section>
      ) : null}
    </WorkspaceLayout>
  );
};
