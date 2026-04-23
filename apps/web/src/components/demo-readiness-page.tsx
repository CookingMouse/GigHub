"use client";

import type { DemoReadinessRecord } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ApiRequestError, healthApi } from "@/lib/api";

type ReadinessState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; readiness: DemoReadinessRecord };

const statusLabel = {
  ready: "Ready",
  needs_seed: "Needs seed",
  degraded: "Degraded"
} satisfies Record<DemoReadinessRecord["status"], string>;

const checkLabel = {
  pass: "Pass",
  warn: "Warn",
  fail: "Fail"
} satisfies Record<DemoReadinessRecord["checks"][number]["status"], string>;

export const DemoReadinessPage = () => {
  const [state, setState] = useState<ReadinessState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const loadReadiness = async () => {
      try {
        const response = await healthApi.readiness();

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          readiness: response.readiness
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
              : "Unable to load demo readiness right now."
        });
      }
    };

    void loadReadiness();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="shell-card">
      <div className="shell-header">
        <div>
          <p className="eyebrow">GigHub Demo</p>
          <h1>System readiness and demo flow</h1>
        </div>
        <Link className="button-secondary" href="/">
          Back home
        </Link>
      </div>

      <p className="muted">
        Use this page before judging or local demos. It checks the required local services, seed
        scenario, and mock-provider configuration without requiring a live GLM key.
      </p>

      {state.status === "loading" ? (
        <section className="inline-panel">
          <h2>Checking readiness</h2>
          <p className="muted">Pinging PostgreSQL, Redis, and demo scenario records.</p>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Readiness unavailable</h2>
          <p className="form-error">{state.message}</p>
          <p className="muted">
            Start the API and local containers, then run <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="status-grid">
            <article className="status-panel">
              <span className="panel-label">Demo status</span>
              <strong>{statusLabel[state.readiness.status]}</strong>
              <p>Generated {new Date(state.readiness.generatedAt).toLocaleString("en-MY")}</p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Providers</span>
              <strong>GLM: {state.readiness.providers.glm}</strong>
              <p>
                Payments: {state.readiness.providers.payments} · Storage:{" "}
                {state.readiness.providers.storage}
              </p>
            </article>
          </div>

          <div className="workspace-grid">
            <section className="inline-panel">
              <p className="eyebrow">Checks</p>
              <h2>Local system readiness</h2>

              <div className="card-stack">
                {state.readiness.checks.map((check) => (
                  <article className="status-panel" key={check.name}>
                    <span className="panel-label">{check.name}</span>
                    <strong>{checkLabel[check.status]}</strong>
                    <p>{check.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="inline-panel">
              <p className="eyebrow">Demo accounts</p>
              <h2>Seeded logins</h2>

              <div className="card-stack">
                {state.readiness.demoAccounts.map((account) => (
                  <article className="status-panel" key={account.email}>
                    <span className="panel-label">{account.role}</span>
                    <strong>{account.email}</strong>
                    <p>Password: <code>{account.password}</code></p>
                    <p className="muted">{account.label}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="inline-panel">
            <p className="eyebrow">Runbook</p>
            <h2>Suggested demo path</h2>
            <ol className="feedback-list">
              {state.readiness.demoFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="action-row">
              <Link className="button-primary" href="/login">
                Start demo login
              </Link>
              <Link className="button-secondary" href="/admin">
                Admin queue
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
};
