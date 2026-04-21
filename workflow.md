# GigHub Workflow

## Purpose

This document defines the implementation workflow for GigHub. It is written to guide future build sessions with Codex. It does not explain product positioning, tech stack, or marketing. It only defines the build order, required outputs, dependencies, and completion criteria for each phase.

## Workflow Rules

- Build GigHub in phases.
- Do not start a new phase until the current phase is working.
- Each phase must leave the codebase in a runnable state.
- Prefer vertical slices over isolated scaffolding when possible.
- Every phase must include:
  - database changes if needed
  - API routes if needed
  - frontend pages or components if needed
  - validation
  - error handling
  - basic tests
- Keep GLM integration server-side only.
- Treat escrow release as a protected state transition.
- Treat audit logging as a required part of core workflows, not an optional extra.

## Global Product Rules

These rules apply across all phases:

- A job cannot be published until:
  - the brief passes GLM validation
- A job can remain published before funding while the company finds or selects a freelancer.
- A job cannot move into active work until:
  - a freelancer has been selected or assigned
  - escrow is funded
- A milestone cannot release payment until:
  - the freelancer has submitted
  - GLM milestone scoring has returned a valid result
  - the milestone state transition is locked and recorded
- A dispute cannot be finalized without:
  - GLM dispute analysis
  - moderator review
  - audit log entry
- Confidential handling uses one locked mode only:
  - encrypted file storage
  - metadata and hash only for GLM
  - 72-hour retention with auto-delete
- Confidential files must never require raw content exposure to GLM.
- Payment data must never be stored directly on the platform.
- All protected routes must use role-based access control.

## Phase 0: Project Foundation

### Goal

Create the base repository structure and development environment.

### Build

- initialize frontend app
- initialize backend API
- configure shared environment loading
- connect PostgreSQL
- connect Redis
- set up linting and formatting
- set up shared types and validation utilities
- create health check route
- create base layout and route groups

### Required Output

- frontend boots successfully
- backend boots successfully
- database connection works
- redis connection works
- environment variables load correctly
- health endpoint returns success

### Done When

- local development starts without manual patching
- the app has a clean folder structure
- there is a working health check for API and app

## Phase 1: Authentication and Roles

### Goal

Implement user authentication and role separation.

### Build

- registration flow
- login flow
- logout flow
- refresh token flow
- HttpOnly cookie session handling
- roles:
  - freelancer
  - company
  - admin
- protected route middleware
- base user profile records

### Required Output

- users can register as freelancer or company
- users can log in and receive valid sessions
- admins have separate access rules
- unauthorized access is blocked

### Done When

- auth works end to end
- protected routes reject invalid or missing sessions
- role checks are enforced on backend routes

## Phase 2: Core Data Model and State Design

### Goal

Define the main schema and core workflow states.

### Build

- user model
- company profile model
- freelancer profile model
- job model
- structured brief model
- escrow model
- milestone model
- submission model
- dispute model
- GLM decision model
- audit log model

### Required Output

- database migrations created
- seed data for test users and sample jobs
- enum/state definitions for:
  - job status
  - escrow status
  - milestone status
  - dispute status

### Done When

- migrations run successfully
- state transitions are clear and enforceable
- seed data supports local testing

## Phase 3: Structured Brief Builder

### Goal

Create the company workflow for drafting a job brief.

### Build

- job creation UI
- structured brief form
- fields for scope, deliverables, timeline, budget, milestone count, requirements
- save draft flow
- preview brief flow
- backend create/update draft endpoints
- Zod validation for brief payloads

### Required Output

- companies can create and save draft briefs
- incomplete or invalid briefs are rejected with clear errors
- draft data persists correctly

### Done When

- a company can create and edit a structured brief from the UI
- the API validates and stores the brief correctly

## Phase 4: GLM Brief Validation

### Goal

Use GLM to validate whether a brief is strong enough to publish.

### Build

- server-side prompt builder for brief validation
- GLM client wrapper
- response parser for:
  - score
  - gaps
  - clarifying questions
- publish gate requiring score `>= 70`
- UI for showing validation score and missing details
- audit log for validation attempts

### Required Output

- briefs can be submitted for validation
- weak briefs are blocked from publishing
- clarifying questions are shown to the company

### Done When

- publishing fails for vague briefs
- publishing succeeds only when validation passes
- GLM output is stored and traceable

## Phase 5: Escrow Funding Workflow

### Goal

Require funded escrow only after a freelancer is selected and before any work becomes active.

### Build

- freelancer selection or assignment record
- company confirmation of selected freelancer
- escrow creation logic
- payment intent creation
- payment callback/webhook handling
- job activation after successful payment
- failed payment handling
- escrow transaction ledger
- Redis lock for critical payment state updates

### Required Output

- company can publish a validated job before funding
- company can fund a job only after a freelancer is selected or assigned
- payment success updates escrow state
- unfunded jobs cannot activate

### Done When

- a published job can remain open before funding
- a job remains inactive until payment succeeds after freelancer selection
- escrow state transitions are logged
- duplicate release or duplicate funding updates are prevented

## Phase 6: Milestone Setup

### Goal

Allow funded jobs to be split into milestone-based delivery.

### Build

- milestone creation UI
- backend milestone creation endpoints
- support up to 5 milestones
- milestone amount validation
- due dates
- 50/50 split option
- milestone state machine

### Required Output

- companies can define milestone schedules
- totals must match funded escrow amount
- milestone records are visible to both company and freelancer

### Done When

- milestone structure is stable and enforceable
- invalid milestone totals are rejected

## Phase 7: Freelancer Job View and Submission Flow

### Goal

Allow freelancers to view assigned work and submit milestone deliverables.

### Build

- freelancer dashboard for active jobs
- milestone detail page
- submission form
- file upload flow
- submission notes
- timestamp capture
- activity log capture

### Required Output

- freelancer can submit a milestone
- submission record is stored
- uploaded files are linked to the submission
- activity history is available for later review

### Done When

- a complete milestone submission can be created from the UI
- the backend records metadata and activity properly

## Phase 8: File Handling and Metadata Extraction

### Goal

Support the locked confidential file workflow for verification.

### Build

- file storage integration
- encrypted confidential storage flow
- SHA-256 hash generation
- metadata extraction for:
  - PDF word count
  - DOCX word count
  - image dimensions
  - file size
  - file type
- 72-hour auto-delete workflow
- metadata-only GLM handoff path

### Required Output

- files upload successfully
- metadata is extracted and stored
- confidential workflow avoids sending raw file content to GLM
- retention and delete logic are enforced for the single confidential mode

### Done When

- submission metadata is available for AI scoring
- confidential file handling works without content exposure
- there are no multi-tier storage branches in the implementation plan

## Phase 9: GLM Milestone Scoring

### Goal

Use GLM to verify milestone fulfilment and drive escrow release decisions.

### Build

- milestone scoring prompt builder
- scoring request using:
  - original brief
  - submission metadata
  - activity log
  - file hash
- response parser for:
  - overall score
  - requirement scores
  - pass / partial / fail
  - reasoning
- milestone review state handling
- protected escrow release trigger
- audit logging for all AI decisions

### Required Output

- every milestone submission can be sent for AI scoring
- valid pass results can trigger release flow
- partial and fail states are handled correctly

### Done When

- escrow release depends on milestone scoring result
- release events are locked and traceable
- invalid or malformed GLM output is safely handled

## Phase 10: Client Review and Auto-Release

### Goal

Let clients review milestone submissions while preventing indefinite delay.

### Build

- client review UI
- approve action
- request revision action
- reject action
- review deadline tracking
- 72-hour auto-release scheduler or worker
- notification hooks

### Required Output

- clients can review each submission
- inactivity beyond 72 hours triggers auto-release
- all review actions are logged

### Done When

- review decisions update milestone states correctly
- auto-release works reliably for unresponsive clients

## Phase 11: Dispute Workflow

### Goal

Handle submission conflicts in a formal and reviewable process.

### Build

- dispute creation flow
- dispute detail UI
- capture rejection reason
- capture client dispute history
- GLM dispute analysis prompt
- response parser for:
  - recommendation
  - bad-faith flags
  - reasoning
- moderator review workflow
- final decision handling
- payout or revision resolution logic

### Required Output

- disputes can be opened from rejected milestones
- moderators can review GLM recommendations
- final decisions update payment state correctly

### Done When

- dispute lifecycle is complete from rejection to resolution
- moderator actions are logged
- final decisions are auditable

## Phase 12: Income Intelligence

### Goal

Turn completed platform work into usable earnings insight.

### Build

- completed jobs aggregation
- freelancer earnings summary
- benchmark comparison input pipeline
- GLM income intelligence prompt
- response parser for:
  - income summary
  - market benchmark
  - recommended rate range
  - income statement text
- dashboard UI
- PDF generation flow

### Required Output

- freelancers can view earnings summaries
- freelancers can generate a PDF income statement
- platform stores statement metadata and generation history

### Done When

- completed job history produces usable income output
- PDF statement generation works end to end

## Phase 13: Job Matching

### Goal

Recommend relevant jobs to freelancers using semantic understanding.

### Build

- portfolio and skills profile input
- open job indexing
- GLM job matching prompt or ranking workflow
- match score output
- recommended jobs UI

### Required Output

- freelancers receive ranked job suggestions
- match results are more than simple keyword overlap

### Done When

- job recommendations are generated from freelancer and job context
- results can be displayed on dashboard views

## Phase 14: Admin and Audit Layer

### Goal

Provide admin controls for moderation, monitoring, and traceability.

### Build

- admin dashboard
- view jobs, milestones, disputes, GLM decisions
- moderator queue
- audit log browser
- client risk history view
- flagged bad-faith activity view

### Required Output

- admins can monitor core workflows
- moderators can process dispute cases
- audit records are searchable

### Done When

- admin can trace a job from creation to payout
- dispute and payout events are reviewable from one place

## Phase 15: Testing and Hardening

### Goal

Stabilize the platform for demo and future extension.

### Build

- unit tests for critical services
- integration tests for:
  - auth
  - escrow funding
  - milestone submission
  - GLM scoring
  - dispute resolution
- webhook tests
- invalid state transition tests
- error boundary handling
- retry handling for external services

### Required Output

- high-risk flows have automated coverage
- payment and escrow transitions are validated
- GLM failure states are handled safely

### Done When

- critical flows pass tests reliably
- broken external responses do not corrupt state

## Phase 16: Demo Readiness

### Goal

Prepare a complete end-to-end hackathon demo.

### Build

- seeded demo accounts
- seeded demo jobs
- one successful escrow flow
- one rejected milestone and dispute flow
- one income statement generation flow
- mobile UI pass
- final environment setup guide

### Required Output

- a full demo can be run from fresh setup
- happy path and dispute path are both demonstrable

### Done When

- judges can see the complete loop:
  - brief validation
  - escrow funding
  - milestone scoring
  - dispute handling
  - income statement generation

## Phase Prompt Format for Codex

Use this structure when prompting Codex for each phase:

### Prompt Template

- implement `Phase X: [name]` from `workflow.md`
- complete the phase fully, not partially
- keep the app runnable after changes
- include backend, frontend, validation, and tests where relevant
- do not skip auth, state rules, or audit logging
- explain what was implemented, what remains, and any assumptions

## Non-Negotiable Checks

These checks must hold across the build:

- no job publish without GLM brief validation
- no active job without funded escrow
- no payout without valid milestone state transition
- no dispute closure without moderator action
- no raw PII in GLM prompts
- no client payment details stored directly
- no confidential file content sent to GLM

## Final Workflow Completion Standard

GigHub is workflow-complete when:

- a company can create a structured brief
- GLM can validate the brief
- escrow can be funded before work begins
- milestones can be created and submitted
- GLM can score milestone completion
- escrow release depends on that scoring logic
- disputes can be opened and resolved
- freelancers can generate income statements
- admins can review the full audit trail
