"use client";

import type { JobMatchRecord } from "@gighub/shared";
import React, { useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";

type MatchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; matches: JobMatchRecord[] };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const FreelancerJobMatchesPanel = () => {
  const [state, setState] = useState<MatchState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const loadMatches = async () => {
      try {
        const response = await freelancerWorkspaceApi.listJobMatches();

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          matches: response.matches
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof ApiRequestError
              ? error.message
              : "Unable to load job matches right now."
        });
      }
    };

    void loadMatches();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="inline-panel">
      <p className="eyebrow">Job matching</p>
      <h2>Mock semantic recommendations</h2>

      {state.status === "loading" ? (
        <p className="muted">Ranking open jobs against your profile skills.</p>
      ) : null}

      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" && state.matches.length === 0 ? (
        <p className="muted">No open jobs are available for matching yet.</p>
      ) : null}

      {state.status === "ready" && state.matches.length > 0 ? (
        <div className="card-stack">
          {state.matches.slice(0, 5).map((match) => (
            <article className="list-card" key={match.jobId}>
              <div className="list-card-header">
                <div>
                  <p className="eyebrow">{match.companyName}</p>
                  <h3>{match.title}</h3>
                  <p className="muted">
                    {formatCurrency(match.budget)} · {match.milestoneCount} milestone(s)
                  </p>
                </div>
                <span className="status-chip">{match.matchScore}/100</span>
              </div>

              {match.requiredSkills.length > 0 ? (
                <p className="muted">Brief signals: {match.requiredSkills.join(", ")}</p>
              ) : null}

              <ul className="feedback-list">
                {match.reasons.map((reason) => (
                  <li key={`${match.jobId}-${reason}`}>{reason}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};
