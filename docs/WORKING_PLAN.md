# GigHub Internal Working Plan

## 1. Project Context and Mission
GigHub is an escrow-backed freelance marketplace built for Malaysia to solve wage protection and payment guarantee gaps affecting 1.64 million gig workers and freelancers. It is aligned to the hackathon domain: AI for Economic Empowerment and Decision Intelligence.

Core operating model:
- Companies post jobs and fund escrow before work begins.
- GLM (`glm-4`, Zhipu AI OpenAI-compatible API) is the decision layer for brief quality, milestone verification, dispute support, and income intelligence.
- Freelancers complete milestones and submit deliverables.
- Escrow releases only when GLM confirms milestone fulfillment.
- If GLM is disabled, escrow release decisions cannot run; the core value proposition breaks.

## 2. Problem Statement (Malaysia-Specific)
GigHub addresses these economic realities:
1. Non-payment and late payment by clients; weak recourse before the Gig Workers Act 2025 framework.
2. No direct minimum wage floor for gig workers despite RM1,700 national minimum wage context.
3. Gross versus net pay confusion due to fees, fuel, and SOCSO deductions.
4. Lack of formal income proof for bank loans and mortgages.
5. Low retirement protection uptake (EPF i-Saraan and SOCSO SESSS participation gaps).
6. Youth unemployment pressure (10.3% in 2025) pushing young workers into precarious gig work.
7. Regulatory shocks can abruptly remove income channels (for example, APAD actions in May 2025).
8. Global platform and AI competition compresses local rates.

Structural traps to avoid:
- Escrow without objective verification only moves disputes to another stage.
- Legal recognition does not automatically create a payment safety net.
- Confidential work requires metadata-based verification, not raw content sharing.
- Sector economics differ; one rate logic is invalid across job types.

## 3. GLM Non-Removable Contract
GLM is mandatory for these five functions:
1. Brief validation
- Input: structured brief JSON.
- Output: `{ score, gaps[], clarifying_questions[] }`.
- Rule: score must be 70 or above before job publication.

2.
- Input: `{ brief, milestone_score, activity_log, rejection_reason, client_dispute_history }`.
- Output: `{ recommendation, bad_faith_flags[], reasoning }`.
- Rule: mo Milestone scoring
- Input: `{ brief, submission_metadata, activity_log, file_hash, timestamps }`.
- Output: `{ overall_score, requirement_scores[], pass_fail, reasoning }`.
- Rule: this output is the escrow release trigger.

3. Dispute analysisderator reviews AI output and closes within 48 hours.

4. Income intelligence
- Input: `{ completed_jobs[], skills[], location, sector }`.
- Output: `{ income_summary, market_rate_benchmark, recommended_rate_range, income_statement_text }`.
- Rule: used to generate formal income statement PDFs.

5. Job matching
- Input: freelancer profile and active briefs.
- Output: ranked fit list using semantic match, not keyword-only ranking.

Removability test:
- If GLM is unavailable, brief gating, milestone release decisions, dispute intelligence, and formal income statement generation all fail. Platform degrades to file exchange plus payment hold.

## 4. Product Requirements and Rules
### 4.1 Brief and Job Posting
- Structured brief form is mandatory.
- GLM validation runs before publication.
- Vague briefs are blocked until clarified.

### 4.2 Escrow and Milestone Engine
- Full amount escrowed before work starts.
- Up to five milestones per project.
- 50/50 split option supported.
- 72-hour auto-release if client is unresponsive after valid submission.
- Watermarked previews available for design workflows.

### 4.3 Dispute and Moderation
- Client rejection must include reason.
- GLM dispute analysis generates neutral recommendation and risk flags.
- Human moderator finalizes rulings within 48 hours.

### 4.4 Income Intelligence
- Dashboard summarizes completed work and earnings.
- Benchmark compares current rates to market by skill/sector/location.
- PDF income statement produced for loan and mortgage support.

## 5. Confidentiality Model (Single Mode Only)
Locked model for implementation:
- End-to-end encryption for file payloads.
- GLM receives metadata and hash only; no raw file content.
- Default retention is 72 hours with auto-delete.
- SHA-256 hash stored in PostgreSQL as delivery proof.

This plan does not use multi-tier confidentiality modes.

## 6. Architecture and Stack
### 6.1 Technology Choices
- Frontend: Next.js (App Router), mobile-first UX.
- Backend: Node.js + Express REST API.
- Primary DB: PostgreSQL.
- Cache/locks/queues: Redis.
- File storage: Cloudflare R2.
- Payments: Stripe sandbox (demo), iPay88 (production option).
- AI: Zhipu GLM-4 via OpenAI-compatible API.
- Metadata extraction: pdfparse, sharp, mammoth.
- PDF generation: pdfkit.

### 6.2 Logical Data Flow
1. User action in web app hits API.
2. API validates input with Zod and auth checks.
3. API orchestrates escrow state and GLM calls.
4. Files stored encrypted in R2; metadata extracted server-side.
5. Decisions, audits, and hashes written to PostgreSQL.
6. Redis enforces escrow release lock and caches GLM responses.
7. Payment webhooks update escrow/payment state.

## 7. Public Interface Contracts
### 7.1 API Namespace
- Prefix: `/api/v1` for all application endpoints.

### 7.2 Endpoint Groups (Baseline)
- Auth: login, refresh, logout, me.
- Jobs: create brief, validate brief, publish job, list jobs.
- Escrow: initialize funding, confirm payment, status.
- Milestones: submit, score, approve/reject, release.
- Disputes: create, analyze, moderator decision.
- Income: summary, benchmark, statement generation.
- Webhooks: payment provider event handlers.

### 7.3 Response and Error Baseline
- JSON responses only.
- Deterministic error structure with code, message, request_id.
- Explicit decision payloads for milestone and dispute endpoints.

## 8. Escrow State Machine Rules
Required states:
- `draft`
- `published`
- `funded`
- `in_progress`
- `submitted`
- `ai_passed`
- `released`
- `rejected`
- `disputed`
- `resolved`
- `refunded`

Transition constraints:
- `published -> funded`: payment success required.
- `submitted -> ai_passed`: valid GLM pass required.
- `ai_passed -> released`: immediate or timed release path.
- `submitted -> rejected`: client rejection with reason.
- `rejected -> disputed`: freelancer dispute initiation.
- `disputed -> resolved`: moderator closes with ruling.

Concurrency and idempotency:
- Release path must acquire Redis lock.
- Webhook and release operations must be idempotent by external event ID and milestone ID.

## 9. Data Safety and Compliance Controls
- PDPA-aligned minimization and role-restricted access.
- Gig Workers Act-aligned dispute and accountability logging.
- GLM prompts assembled server-side only; no browser API key exposure.
- Prompt redaction replaces direct PII with role tokens (`freelancer_1`, `client_1`).
- Payment data is not stored (PCI scope delegated to Stripe/iPay88).
- Stored payment record: transaction ID, amount, status, timestamp.
- JWT model: 15-minute access token, 7-day refresh token in HttpOnly cookies.
- RBAC roles: freelancer, company, admin.
- PostgreSQL row-level security via user-based partitioning logic.
- Zod validation enforced on all routes.

## 10. Build and Delivery Plan
### Phase 1: Foundation
- Monorepo skeleton and shared packages.
- Auth, RBAC, and base schema.
- Core infra wiring (PostgreSQL, Redis, R2, Stripe sandbox, GLM adapter).

### Phase 2: Core Transaction Loop
- Structured brief builder and GLM brief validation gate.
- Escrow funding and milestone entities.
- Submission pipeline with metadata extraction and hashing.
- GLM milestone scoring and release trigger integration.

### Phase 3: Disputes and Moderation
- Rejection flow and dispute creation.
- GLM dispute analysis integration.
- Moderator review/decision workflow with 48-hour SLA tracking.

### Phase 4: Income Intelligence
- Completed-job aggregation and benchmark logic.
- Income statement generation with pdfkit.
- Dashboard views and export endpoints.

### Phase 5: Hardening
- Locking/idempotency checks.
- Audit completeness.
- Load/performance tuning and observability.

## 11. Testing and Acceptance Matrix
### 11.1 Unit Tests
- Escrow state transitions and guards.
- GLM response schema parsing and validation.
- Metadata extraction adapters.
- Token and permission utilities.

### 11.2 Integration Tests
- Funded job -> milestone submit -> GLM pass -> escrow release.
- Submit -> client reject -> dispute -> moderator resolution.
- 72-hour client inactivity auto-release.
- GLM downtime blocks release and surfaces actionable error.

### 11.3 Security Tests
- Auth/session expiry behavior.
- RBAC enforcement across roles.
- RLS data isolation.
- PII redaction in prompt payload logs.

### 11.4 Demo Validation (Hackathon)
- Scenario-based escrow walk-through.
- GLM brief-score and milestone-score demonstration.
- Income statement PDF generation scenario.

## 12. Roadmap
### MVP (Hackathon)
- End-to-end escrow and milestone release flow.
- GLM brief and milestone intelligence.
- Dispute analysis with moderator closure.
- Basic income intelligence and statement PDF.

### Post-Hackathon
- Sector-specific benchmark depth expansion.
- iPay88 production rails and reconciliation tooling.
- Stronger anti-fraud and bad-faith profiling.
- Institutional integrations for income verification.

## 13. Codex Session Operating Checklist
Before coding:
1. Read this working plan.
2. Confirm locked decisions are unchanged.
3. Inspect existing schema/routes/tests before edits.

During implementation:
1. Update contracts/types first.
2. Implement backend logic.
3. Wire frontend flows.
4. Add tests.
5. Update documentation.

Done criteria per feature:
1. API contract updated.
2. State transition rules respected.
3. Failure path implemented.
4. Audit events emitted.
5. Tests added and passing.

## 14. Manual Privacy Workflow
This file is intentionally internal.
- Keep it out of published repository history by deleting it before commits when needed.
- Verify with `git status` before every commit.

## 15. Fixed Assumptions
- API versioning uses `/api/v1`.
- Package manager examples use `npm`.
- Stripe sandbox is the demo default.
- GLM remains non-removable from release and dispute loops.
- Confidentiality is single-mode only (E2E + metadata-only AI verification + 72-hour retention).
