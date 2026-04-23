"use client";

import type { AdminDisputeListRecord, PublicUser } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "@/lib/api";
import { LogoutButton } from "./logout-button";

type AdminDisputesPageProps = {
  user: PublicUser;
};

type DisputesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; disputes: AdminDisputeListRecord[] };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

export const AdminDisputesPage = ({ user }: AdminDisputesPageProps) => {
  const [state, setState] = useState<DisputesState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const loadDisputes = async () => {
      try {
        const response = await adminApi.listDisputes();

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          disputes: response.disputes
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
              : "Unable to load the admin dispute queue right now."
        });
      }
    };

    void loadDisputes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="shell-card">
      <div className="shell-header">
        <div>
          <p className="eyebrow">GigHub</p>
          <h1>Admin dispute queue</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="status-grid">
        <article className="status-panel">
          <span className="panel-label">Signed in as</span>
          <strong>{user.name}</strong>
          <p>{user.email}</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Role</span>
          <strong>{user.role}</strong>
          <p>Moderator review is protected behind seeded admin accounts only.</p>
        </article>
      </div>

      <p className="muted">
        Review company rejections, compare them against mocked GLM arbitration, and close the case
        with either release or revision.
      </p>

      <div className="action-row">
        <Link className="button-secondary" href="/admin/audit">
          Audit and verification
        </Link>
      </div>

      {state.status === "loading" ? (
        <section className="inline-panel">
          <h2>Loading disputes</h2>
          <p className="muted">Pulling the current moderation queue.</p>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Queue unavailable</h2>
          <p className="form-error">{state.message}</p>
        </section>
      ) : null}

      {state.status === "ready" && state.disputes.length === 0 ? (
        <section className="inline-panel">
          <h2>No open disputes</h2>
          <p className="muted">New company rejections will appear here for moderator review.</p>
        </section>
      ) : null}

      {state.status === "ready" && state.disputes.length > 0 ? (
        <div className="card-stack">
          {state.disputes.map((dispute) => (
            <article className="list-card" key={dispute.id}>
              <div className="list-card-header">
                <div>
                  <p className="eyebrow">Dispute</p>
                  <h2>{dispute.jobTitle}</h2>
                  <p className="muted">
                    {dispute.milestoneTitle} · {dispute.companyName} vs {dispute.freelancerName}
                  </p>
                </div>
                <span className="status-chip">{dispute.status}</span>
              </div>

              <p>{dispute.rejectionReason}</p>

              <div className="status-grid compact-grid">
                <article className="status-panel">
                  <span className="panel-label">Mock GLM recommendation</span>
                  <strong>{dispute.recommendation ?? "Pending"}</strong>
                  <p>
                    {dispute.badFaithFlags.length > 0
                      ? dispute.badFaithFlags.join(", ")
                      : "No bad-faith flags raised."}
                  </p>
                </article>

                <article className="status-panel">
                  <span className="panel-label">Opened at</span>
                  <strong>{formatDate(dispute.openedAt)}</strong>
                  <p>Queue order is newest dispute first.</p>
                </article>
              </div>

              <div className="action-row">
                <Link className="button-primary" href={`/admin/disputes/${dispute.id}`}>
                  Review dispute
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};
