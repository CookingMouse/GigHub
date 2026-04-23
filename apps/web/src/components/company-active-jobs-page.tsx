"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ApiRequestError, jobsApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

export const CompanyActiveJobsPage = () => {
  const session = useProtectedUser("company");
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof jobsApi.list>>["jobs"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    const load = async () => {
      try {
        const response = await jobsApi.list();
        setJobs(response.jobs.filter((job) => ["IN_PROGRESS", "ASSIGNED", "ESCROW_FUNDED"].includes(job.status)));
      } catch (loadError) {
        setError(loadError instanceof ApiRequestError ? loadError.message : "Unable to load active jobs.");
      }
    };

    void load();
  }, [session.status]);

  if (session.status !== "ready") {
    return null;
  }

  return (
    <WorkspaceLayout
      title="Active Job"
      subtitle="Monitor freelancer progress for active jobs."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      <div className="card-stack">
        {jobs.map((job) => (
          <article className="inline-panel" key={job.id}>
            <h2>{job.title}</h2>
            <p className="muted">Status: {job.status}</p>
            <p className="muted">
              Freelancer: {job.assignedFreelancer ? job.assignedFreelancer.displayName : "Not assigned"}
            </p>
            <Link className="button-primary" href={`/jobs/${job.id}`}>
              Open Job
            </Link>
          </article>
        ))}
      </div>
    </WorkspaceLayout>
  );
};
