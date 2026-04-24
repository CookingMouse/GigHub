# GigHub Freelancer Browse Job Split

## Scope

This design covers the freelancer workspace navigation and the split between job discovery and request tracking.

The goal is to separate browsing currently applyable jobs from managing the freelancer's own applications and company invitations.

## Approved Decisions

- The freelancer sidebar adds a new `Browse Job` tab.
- `Browse Job` appears after `Dashboard` and before `Job Request`.
- `Browse Job` shows only currently applyable jobs posted by companies.
- `Job Request` no longer shows the open jobs browse list.
- `Job Request` becomes the place for the freelancer to manage:
  - submitted applications
  - company invitations
- The implementation uses the existing frontend and backend APIs.
- The first pass includes browse controls for:
  - search
  - sort
  - budget filtering
- The first pass does not include:
  - milestone-count filtering
  - backend search or filtering
  - a dedicated full job-detail page

## Navigation

The freelancer sidebar order becomes:

1. `Dashboard`
2. `Browse Job`
3. `Job Request`
4. `Active Job`
5. `Income Generator`
6. `Inbox`
7. `Profile`

This keeps discovery and request management as separate destinations with clear intent.

## Page Responsibilities

### Browse Job

`Browse Job` is the discovery page for freelancers.

It is responsible for:

- listing currently applyable jobs
- showing lightweight job summary cards
- allowing the freelancer to apply directly
- indicating whether the freelancer has already applied to a listed job
- giving the freelancer client-side browse controls

Each card should show:

- job title
- company name
- budget
- milestone count
- published date
- application status, if one exists
- primary action: `Apply`

If the freelancer has already applied to a job, the card should still remain visible but the action should no longer encourage duplicate submission.

### Job Request

`Job Request` becomes the request-management page.

It is responsible for:

- showing the freelancer's submitted applications
- showing company invitations
- supporting invitation accept and reject actions

The open-job browse list is removed from this page entirely.

## Browse Controls

`Browse Job` includes a compact client-side control bar above the job list.

### Controls

- `Search` input
- `Sort` dropdown
- `Min budget`
- `Max budget`
- `Clear filters`

### Behavior

- search matches job title and company name
- search is case-insensitive
- default sort is `Newest`
- sort options are:
  - `Newest`
  - `Highest budget`
  - `Lowest budget`
- budget filters apply to the loaded list only
- filtering and sorting happen client-side without new API requests

## Data Mapping

This split should prefer the data already exposed by the product.

- `Browse Job` uses `requestsApi.listAvailability()` for currently applyable jobs
- `Browse Job` also uses `requestsApi.listFreelancerRequests()` to map existing application status onto job cards
- `Job Request` uses `requestsApi.listFreelancerRequests()` for:
  - applications
  - invitations
- applying from `Browse Job` reuses `requestsApi.applyToJob()`
- invitation actions continue to use `requestsApi.respondInvitation()`

No backend API changes are required for this pass.

## States And Interactions

### Loading

- `Browse Job` shows a stable loading state for the control bar and job cards
- `Job Request` shows a stable loading state for applications and invitations

### Empty States

- `Browse Job`: `No open jobs available right now`
- filtered `Browse Job`: `No jobs match your current filters`
- `Job Request` applications: `You have not applied to any jobs yet`
- `Job Request` invitations: `No company requests yet`

### Error Handling

- `Browse Job` should fail with a clear page-level error if browse data cannot load
- an apply failure should not collapse the rest of the page
- `Job Request` should show a clear page-level error if request data cannot load

## Testing

### Browse Job

- renders browse cards from availability data
- shows existing application status when present
- filters by search query
- sorts by newest and budget
- filters by budget range
- applies to a job and reloads the page state

### Job Request

- renders submitted applications without the open-job browse list
- renders invitations with company link and accept or reject actions
- preserves empty and error states after the split

### Navigation

- freelancer sidebar includes `Browse Job` in the approved position
- the new route is highlighted correctly when active

## Done Criteria

The split is complete when:

- the freelancer sidebar contains `Browse Job` in the approved order
- `Browse Job` exists as its own page
- `Browse Job` shows only currently applyable jobs
- `Browse Job` supports search, sort, budget filters, and clear filters
- `Job Request` only shows applications and invitations
- existing apply and invitation flows still work
- tests cover the new page and the refactored request page
