"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

export const FreelancerActiveJobsPage = () => {
  const session = useProtectedUser("freelancer");
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof freelancerWorkspaceApi.listJobs>>["jobs"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    const load = async () => {
      try {
        const response = await freelancerWorkspaceApi.listJobs();
        setJobs(response.jobs);
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
    <WorkspaceLayout title="Active Work" subtitle="Track active work and milestones." user={session.user}>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="card-stack">
        {jobs.map((job) => (
          <article className="inline-panel" key={job.id}>
            <h2>{job.title}</h2>
            <p className="muted">{job.companyName}</p>
            <div className="action-row">
              {job.milestones.map((milestone) => (
                <Link
                  className="button-secondary"
                  href={`/freelancer/milestones/${milestone.id}`}
                  key={milestone.id}
                >
                  Milestone {milestone.sequence}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </WorkspaceLayout>
  );
};
