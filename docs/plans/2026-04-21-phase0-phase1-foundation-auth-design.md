# GigHub Phase 0 + Phase 1 Design

## Scope

This design covers Phase 0 and Phase 1 together on the `phase1` branch:

- Phase 0: project foundation
- Phase 1: authentication and roles

The repository is currently empty aside from planning documents, so this branch will establish the initial monorepo structure and deliver a complete minimal authentication flow.

## Approved Decisions

- Repository layout uses `npm` workspaces.
- Monorepo structure:
  - `apps/web` for the Next.js App Router frontend
  - `apps/api` for the Express API
  - `packages/shared` for shared types, validation, and constants
- Backend stack uses:
  - TypeScript
  - Prisma with PostgreSQL
  - Redis client
  - custom JWT auth in Express
- Authentication uses email and password for:
  - `freelancer`
  - `company`
- `admin` is seeded manually and is not self-registerable.
- Frontend scope is a complete minimal auth UX:
  - register
  - login
  - logout
  - protected route handling
  - role-based dashboard placeholders
- Local development uses Docker Compose for PostgreSQL and Redis.
- External provider API keys are not required for this branch.

## Architecture

### Repository Structure

```text
.
|-- apps/
|   |-- web/
|   |-- api/
|-- packages/
|   |-- shared/
|-- docs/
|   |-- plans/
|-- docker-compose.yml
|-- package.json
|-- tsconfig.base.json
|-- .env.example
```

### Runtime Flow

- `apps/web` sends requests to `apps/api`.
- `apps/api` owns all authentication, cookie handling, role checks, and persistence.
- Prisma connects the API to PostgreSQL.
- Redis stores refresh/session state for token rotation and logout invalidation.
- Shared auth schemas and common constants live in `packages/shared`.

## Backend Design

### API Surface

Phase 0 + Phase 1 should expose:

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

### Auth Model

- Access token lifetime: `15 minutes`
- Refresh token lifetime: `7 days`
- Tokens are issued by the API
- Tokens are stored in HttpOnly cookies
- Refresh tokens are rotated and backed by Redis session state
- RBAC middleware protects authenticated and admin-only routes

### Initial Data Model

- `User`
  - `id`
  - `email`
  - `passwordHash`
  - `role`
  - `createdAt`
  - `updatedAt`
- `FreelancerProfile`
  - `id`
  - `userId`
  - `displayName`
- `CompanyProfile`
  - `id`
  - `userId`
  - `companyName`

## Frontend Design

### Pages

- `/login`
- `/register`
- `/dashboard`
- `/admin`

### Behavior

- unauthenticated users are redirected away from protected pages
- authenticated users see a minimal role-aware dashboard shell
- admin users can access `/admin`
- freelancer and company users are prevented from accessing admin pages

## Error Handling

- API returns a consistent JSON error shape
- request payloads are validated with Zod
- invalid credentials return a generic safe error
- missing or invalid sessions are handled through refresh or redirect to login
- protected frontend pages redirect when the session is unavailable

## Testing

### API Tests

- register freelancer
- register company
- reject duplicate email
- login success
- login failure
- refresh success
- refresh failure
- `me` for authenticated user
- `me` for unauthenticated user
- admin RBAC guard

### Web Coverage

- login page renders
- register page renders
- protected page redirects when unauthenticated

## Environment

Required for this branch:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `WEB_URL`
- `API_URL`
- cookie configuration values

Placeholder-only env vars may exist for later phases:

- GLM configuration
- Stripe configuration
- R2 configuration

## Done Criteria

Phase 0 + Phase 1 are complete when:

- a fresh clone boots with `docker compose` and `npm install`
- Prisma migrations and seed run successfully
- freelancer and company users can register and log in
- a seeded admin can log in
- protected routes and RBAC work
- the branch runs without any external API keys
