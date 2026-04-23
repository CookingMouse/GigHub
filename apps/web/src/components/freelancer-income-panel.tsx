"use client";

import type { IncomeStatementRecord, IncomeSummaryRecord } from "@gighub/shared";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";

type IncomeState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      summary: IncomeSummaryRecord;
      statements: IncomeStatementRecord[];
    };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium"
  }).format(new Date(value));

const defaultPeriodStart = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().slice(0, 10);
};

const defaultPeriodEnd = () => new Date().toISOString().slice(0, 10);

export const FreelancerIncomePanel = () => {
  const [state, setState] = useState<IncomeState>({ status: "loading" });
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadIncome = async () => {
    const response = await freelancerWorkspaceApi.getIncome();

    setState({
      status: "ready",
      summary: response.summary,
      statements: response.statements
    });
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await freelancerWorkspaceApi.getIncome();

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          summary: response.summary,
          statements: response.statements
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
              : "Unable to load income intelligence right now."
        });
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGenerate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGenerateError(null);
    setIsGenerating(true);

    startTransition(async () => {
      try {
        const start = new Date(`${periodStart}T00:00:00.000Z`);
        const end = new Date(`${periodEnd}T23:59:59.999Z`);

        await freelancerWorkspaceApi.generateIncomeStatement({
          periodStart: start.toISOString(),
          periodEnd: end.toISOString()
        });
        await loadIncome();
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setGenerateError(error.message);
        } else {
          setGenerateError("Unable to generate the income statement right now.");
        }
      } finally {
        setIsGenerating(false);
      }
    });
  };

  return (
    <section className="inline-panel">
      <p className="eyebrow">Income intelligence</p>
      <h2>Escrow-backed earnings record</h2>

      {state.status === "loading" ? (
        <p className="muted">Loading released milestone earnings.</p>
      ) : null}

      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <>
          <div className="status-grid compact-grid">
            <article className="status-panel">
              <span className="panel-label">Released earnings</span>
              <strong>{formatCurrency(state.summary.totalEarned)}</strong>
              <p>{state.summary.releasedMilestones} released milestone(s)</p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Completed jobs</span>
              <strong>{state.summary.completedJobs}</strong>
              <p>Average milestone: {formatCurrency(state.summary.avgMilestoneValue)}</p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Latest statement</span>
              <strong>
                {state.summary.latestStatement
                  ? formatDate(state.summary.latestStatement.generatedAt)
                  : "None yet"}
              </strong>
              <p>
                {state.summary.latestStatement
                  ? state.summary.latestStatement.status
                  : "Generate a statement after funds are released."}
              </p>
            </article>
          </div>

          <form className="form-grid" onSubmit={handleGenerate}>
            <label className="field" htmlFor="income-period-start">
              <span>Period start</span>
              <input
                id="income-period-start"
                onChange={(event) => setPeriodStart(event.target.value)}
                type="date"
                value={periodStart}
              />
            </label>

            <label className="field" htmlFor="income-period-end">
              <span>Period end</span>
              <input
                id="income-period-end"
                onChange={(event) => setPeriodEnd(event.target.value)}
                type="date"
                value={periodEnd}
              />
            </label>

            {generateError ? <p className="form-error">{generateError}</p> : null}

            <div className="action-row">
              <button className="button-primary" disabled={isGenerating} type="submit">
                {isGenerating ? "Generating..." : "Generate income statement"}
              </button>
            </div>
          </form>

          {state.statements.length > 0 ? (
            <div className="card-stack">
              {state.statements.slice(0, 3).map((statement) => (
                <article className="status-panel" key={statement.id}>
                  <span className="panel-label">
                    {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                  </span>
                  <strong>{formatCurrency(statement.totalEarned)}</strong>
                  <p>
                    {statement.totalJobs} job(s), {statement.totalMilestones} milestone(s), token{" "}
                    <code>{statement.verifyToken}</code>
                  </p>
                  {statement.glmNarrative ? <p className="muted">{statement.glmNarrative}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
};
