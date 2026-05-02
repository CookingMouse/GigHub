# GigHub

> An escrow-backed freelance marketplace where every milestone is paid only when work ships.

GigHub connects companies with freelancers and uses milestone-locked escrow plus AI-assisted brief validation to make project work safer for both sides. Companies fund a project once; payment is automatically released to the freelancer milestone-by-milestone after each deliverable is approved (or auto-released if the company doesn't review within 72 hours).

**Demo Video**: https://drive.google.com/file/d/1RqPwPTXfHY9eap6rt7_YWJXGbH1OnJhJ/view?usp=sharing

---

## Core Features

### For Companies
- **Structured job briefs** with overview, scope, deliverables, requirements, and acceptance criteria.
- **AI brief validation** — every brief is scored 0–100 by an LLM (Z.ai / Gemini / ILMU compatible). Briefs below 70 are blocked from publishing, reducing dispute risk before any money moves.
- **Escrow-backed payments** — fund the full project budget once; the platform locks it in escrow.
- **Milestone-by-milestone review** — approve or reject each deliverable with feedback. Approved milestones release funds automatically.
- **Freelancer discovery** — search the directory, view portfolios, download resumes, and invite freelancers directly to specific jobs.
- **AI-powered worker recommendations** — GLM matches your open jobs to suitable freelancers with explainable match scores.

### For Freelancers
- **Browse and apply** to open jobs with verified company information.
- **Encrypted deliverable upload** — submit work as PDF, DOCX, PNG, JPG, or ZIP. Files are encrypted with AES-256-GCM before being written to disk.
- **Milestone timeline** with collapsible status tracking (pending → in progress → submitted → under review → approved → released).
- **Rejection feedback visibility** — see exactly what the company asked you to revise, then resubmit.
- **Verifiable income statements** — generate PDF income reports with public verification tokens for loan or visa applications.

### Cross-cutting
- **Real-time inbox** with conversation threads, milestone progress updates, and platform alerts.
- **End-to-end encryption** for sensitive user data and uploaded files.
- **Notification system** for milestone events, payment releases, deadlines, and disputes.
- **Audit log + activity log** — every state transition is recorded for compliance.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Backend | Express 4, TypeScript, Prisma ORM 6 |
| Database | PostgreSQL 16 |
| Cache / sessions | Redis 7 |
| Authentication | JWT (access + refresh) over HTTP-only cookies, bcrypt password hashing |
| AI | OpenAI-compatible LLM provider (Z.ai / Gemini / ILMU / mock) |
| File handling | Multer · Sharp · Mammoth · pdf-parse · AES-256-GCM encryption |
| Validation | Zod schemas shared between frontend and backend via the `@gighub/shared` workspace |
| Infrastructure | Docker Compose (Postgres + Redis), npm workspaces monorepo |

---

## Project Structure

```
GigHub/
├── apps/
│   ├── api/                  Express backend (10 route groups · 17 services)
│   │   ├── prisma/           Schema and migrations
│   │   └── src/
│   │       ├── routes/       HTTP route handlers
│   │       ├── services/     Business logic
│   │       ├── middleware/   Auth, RBAC, error handling
│   │       └── lib/          JWT, env, Prisma client, etc.
│   └── web/                  Next.js frontend (~40 components)
│       └── src/
│           ├── app/          App-router pages
│           ├── components/   React components
│           └── lib/          API client, form helpers
├── packages/
│   └── shared/               Zod schemas + TypeScript types (single source of truth)
├── docker-compose.yml        Local Postgres + Redis
└── .env.example              Environment template
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **Docker Desktop** (for Postgres and Redis)
- **Git**

### 1. Clone and install

```bash
git clone <your-repo-url>
cd GigHub
npm install
```

### 2. Configure environment

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

At minimum, edit `.env` to set:

```env
JWT_ACCESS_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<run again to get a different value>
FILE_ENCRYPTION_SECRET=<run again for a third unique value>
```

For AI brief validation, set one of:

| Provider | Config |
|---|---|
| **Mock** (recommended for dev/demo) | `GLM_MODE=mock` |
| **Z.ai** | `GLM_MODE=live` · `GLM_BASE_URL=https://api.z.ai/api/paas/v4` · `GLM_MODEL=glm-4.5-flash` · `GLM_API_KEY=<your-key>` |
| **Gemini** (OpenAI-compatible) | `GLM_MODE=live` · `GLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai` · `GLM_MODEL=gemini-2.0-flash` · `GLM_API_KEY=<your-key>` |
| **ILMU** | `GLM_MODE=live` · `GLM_BASE_URL=https://api.ilmu.ai/v1` · `GLM_MODEL=nemo-super` · `GLM_API_KEY=<your-key>` |

### 3. Start Docker services (Postgres + Redis)

```bash
npm run docker:up
```

Verify both containers are healthy:

```bash
docker ps
```

You should see `gighub-postgres` and `gighub-redis` running.

### 4. Set up the database

Apply migrations and seed demo data:

```bash
npm run db:migrate
npm run db:seed
```

This creates ~400 demo users, jobs, milestones, applications, and invitations to make the UI feel populated.

### 5. Run the app

Start both the API and the web in one terminal:

```bash
npm run dev
```

The terminal will show two prefixed streams (`[api]` and `[web]`). Wait until you see:

```
[api] API listening on http://localhost:4000
[web] ✓ Ready on http://0.0.0.0:3000
```

Then open <http://localhost:3000>.

> If you prefer separate terminals, run `npm run dev:api` and `npm run dev:web` in two windows.

---

## Demo Accounts

The seed script creates these test accounts (all use the passwords below):

| Role | Email | Password |
|---|---|---|
| Company (main) | `company@gighub.demo` | `Company123!` |
| Mock companies | `company1@gighub.mock` … `companyN@gighub.mock` | `Company123!` |
| Freelancer (Aina) | `aina@example.com` | `Freelancer123!` |
| Freelancer (Hakim) | `hakim@example.com` | `Freelancer123!` |
| Freelancer (Sofia) | `sofia@example.com` | `Freelancer123!` |

Login at <http://localhost:3000/login>.

---

## Common Commands

| Command | Description |
|---|---|
| `npm run dev` | Start both API and web concurrently |
| `npm run dev:api` | Start only the API |
| `npm run dev:web` | Start only the frontend |
| `npm run docker:up` | Start Postgres + Redis containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Populate demo data |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run lint` | Run typecheck across all workspaces |
| `npm run test` | Run all unit/integration tests |

---

## Troubleshooting

**`P1000` — Authentication failed against database**
Your `DATABASE_URL` in `.env` is wrong. The Docker default is `postgresql://postgres:postgres@localhost:5432/gighub?schema=public`.

**`P1002` / advisory lock timeout when running migrations**
A previous Prisma process is still holding the lock. Stop the API dev server, then retry. If that doesn't work:
```bash
docker exec gighub-postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'gighub' AND pid <> pg_backend_pid();"
```

**`Cannot find module '@aws-sdk/client-s3'`**
Run `npm install --workspace @gighub/api` to pull missing dependencies.

**AI validation never returns a score**
Either the LLM provider key is invalid (401) or rate-limited (429) or timed out (504). Switch `GLM_MODE=mock` for instant deterministic scoring, or check your provider's dashboard for quota/key status.

**File upload fails silently**
Restart the API server after editing `.env`. Files >15 MB are rejected by Multer.

---

## Architecture Highlights

- **Single source of truth for types** — Zod schemas in `packages/shared/src/index.ts` are imported by both the frontend (form validation) and the backend (request validation), guaranteeing the two never drift.
- **Encrypted file storage** — All uploaded files (resumes, deliverables) are encrypted with AES-256-GCM using a key derived from `FILE_ENCRYPTION_SECRET` via HKDF. The on-disk layout is `[12-byte IV][16-byte auth tag][encrypted payload]`.
- **Pluggable storage backend** — `STORAGE_PROVIDER=local` for dev (writes to `.gighub-storage/`); `STORAGE_PROVIDER=r2` switches to Cloudflare R2 for production deployment.
- **Pluggable LLM backend** — Any OpenAI-compatible provider can be used by setting `GLM_BASE_URL`, `GLM_MODEL`, and `GLM_API_KEY`. The mock provider uses a deterministic 9-criterion rubric and is recommended for live demos.
- **State-machine integrity** — Job, milestone, escrow, submission, and dispute statuses are all enforced at the service layer. Invalid transitions throw structured `HttpError` responses.

---

## License

Private project. All rights reserved.
