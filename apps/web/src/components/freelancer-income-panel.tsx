"use client";

import type { IncomeStatementRecord } from "@gighub/shared";
import React, { startTransition, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";

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
  date.setMonth(date.getMonth() - 1);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().slice(0, 10);
};

const defaultPeriodEnd = () => new Date().toISOString().slice(0, 10);

export const FreelancerIncomePanel = () => {
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [statement, setStatement] = useState<IncomeStatementRecord | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleGenerate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGenerateError(null);
    setDownloadError(null);
    setIsGenerating(true);

    startTransition(async () => {
      try {
        const start = new Date(`${periodStart}T00:00:00.000Z`);
        const end = new Date(`${periodEnd}T23:59:59.999Z`);
        const response = await freelancerWorkspaceApi.generateIncomeStatement({
          periodStart: start.toISOString(),
          periodEnd: end.toISOString()
        });

        setStatement(response.statement);
      } catch (error) {
        setStatement(null);

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

  const handleDownloadPdf = () => {
    if (!statement) {
      return;
    }

    setDownloadError(null);
    setIsDownloading(true);

    startTransition(async () => {
      try {
        const response = await freelancerWorkspaceApi.downloadIncomeStatementPdf(statement.id);
        const objectUrl = window.URL.createObjectURL(response.blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = response.fileName;
        document.body.append(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setDownloadError(error.message);
        } else {
          setDownloadError("Unable to download the PDF right now.");
        }
      } finally {
        setIsDownloading(false);
      }
    });
  };

  return (
    <section className="inline-panel">
      <p className="eyebrow">Income generator</p>
      <h2>Formal freelancer income statement</h2>
      <p className="muted">
        Choose a period to generate an escrow-backed statement. Income details remain hidden until
        a period is submitted.
      </p>

      <form className="form-grid" onSubmit={handleGenerate}>
        <label className="field" htmlFor="income-period-start">
          <span>Period start</span>
          <input
            id="income-period-start"
            onChange={(event) => setPeriodStart(event.target.value)}
            required
            type="date"
            value={periodStart}
          />
        </label>

        <label className="field" htmlFor="income-period-end">
          <span>Period end</span>
          <input
            id="income-period-end"
            onChange={(event) => setPeriodEnd(event.target.value)}
            required
            type="date"
            value={periodEnd}
          />
        </label>

        {generateError ? <p className="form-error">{generateError}</p> : null}

        <div className="action-row">
          <button className="button-primary" disabled={isGenerating} type="submit">
            {isGenerating ? "Generating..." : "Generate formal income statement"}
          </button>
        </div>
      </form>

      {statement ? (
        <article className="status-panel">
          <span className="panel-label">
            {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
          </span>
          <strong>{formatCurrency(statement.totalEarned)}</strong>
          <p>
            {statement.totalJobs} job(s), {statement.totalMilestones} milestone(s), generated{" "}
            {formatDate(statement.generatedAt)}
          </p>
          <p className="muted">
            Verification token: <code>{statement.verifyToken}</code>
          </p>
          {statement.glmNarrative ? <p className="muted">{statement.glmNarrative}</p> : null}

          <div className="action-row">
            <button
              className="button-secondary"
              disabled={isDownloading}
              onClick={handleDownloadPdf}
              type="button"
            >
              {isDownloading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>

          {downloadError ? <p className="form-error">{downloadError}</p> : null}

          <div className="card-stack">
            {statement.lineItems.map((lineItem) => (
              <article className="status-panel" key={lineItem.id}>
                <span className="panel-label">{formatDate(lineItem.releasedAt)}</span>
                <strong>{lineItem.jobTitle}</strong>
                <p>
                  {lineItem.companyName} • {formatCurrency(lineItem.amount)}
                </p>
                {lineItem.category ? <p className="muted">{lineItem.category}</p> : null}
              </article>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
};
