# GigHub Freelancer Dashboard Redesign

## Scope

This design covers the freelancer dashboard content area only.

The shell layout already owns the sidebar and topbar. This redesign only changes the dashboard body content so it follows the design language defined in `docs/DashboardLayout.jsx`.

## Approved Decisions

- The freelancer dashboard is a full overview page.
- The dashboard keeps the four summary stat cards at the top.
- The four stats are:
  - `Total earned`
  - `Active jobs`
  - `Pending reviews`
  - `Recommended jobs`
- The main section under the stats is `Active work`.
- The second major section is `Upcoming deadlines`.
- The third major section is `Income history`.
- Recommended jobs do not appear as a dashboard section. They remain on the separate request page.
- Invitations and applications do not appear as a dashboard section.
- The dashboard does not use a right-side highlight panel.

## Design Language

The dashboard must follow the visual rules from `docs/DashboardLayout.jsx` without deviation:

- `DM Sans` for all UI text
- `DM Mono` for numbers and amounts
- page headings:
  - `fontSize: 24`
  - `fontWeight: 600`
  - `letterSpacing: -0.3px`
- section labels:
  - `fontSize: 13`
  - `fontWeight: 600`
  - `textTransform: uppercase`
  - `letterSpacing: 0.06em`
- body and subtext:
  - `fontSize: 14`
  - `color: #6B7280`
- page background: `#F9FAFB`
- card background: `#FFFFFF`
- card border: `1px solid #E5E7EB`
- card border radius: `14px`
- button and badge radius: `9px`
- pill badges use the source color with `15` alpha suffix for the background

## Page Structure

The freelancer dashboard uses a stacked layout:

1. page header
2. four stat cards
3. full-width `Active work`
4. two-column bottom row:
   - `Upcoming deadlines`
   - `Income history`

This structure gives the dashboard a clear scan order:

- top-level performance and status first
- current work second
- schedule and income context after that

## Stat Cards

The stat cards use the existing four-column stat grid pattern.

### Cards

- `Total earned`
- `Active jobs`
- `Pending reviews`
- `Recommended jobs`

### Visual Rules

- label in uppercase muted gray
- numeric value in `DM Mono`, `22px`, semibold
- supporting sub-label in `12px`
- sentiment coloring:
  - green for positive movement
  - gray for neutral information
  - red only for negative or risk signals

### Example Support Copy

- `+RM 1,200 this month`
- `3 milestones in progress`
- `2 awaiting company review`
- `8 jobs matched this week`

## Active Work

`Active work` is the primary operational section of the dashboard.

### Layout

- full-width section below the stat cards
- activity-card-style grid
- each card represents one job

### Content Per Card

- job title
- company name
- status pill in the top-right
- progress summary
- current milestone name
- next due date
- primary button: `Open current milestone`

### Data Rules

- include all non-completed jobs
- include in-progress jobs
- include under-review jobs
- exclude completed jobs

### Interaction Rules

- hover state adds accent border and soft accent ring
- progress is the most prominent piece of card content
- deadline remains visible but secondary

## Upcoming Deadlines

`Upcoming deadlines` is the left card in the bottom row.

### Layout

- white card container
- mini monthly calendar
- upcoming items associated with due dates

### Content

Each due item should show:

- milestone or job name
- due date
- company name
- urgency badge such as:
  - `Today`
  - `Tomorrow`
  - `This week`

### Purpose

- provide a fast planning view
- surface deadline pressure without opening each job
- support overview behavior instead of becoming a full scheduling system

## Income History

`Income history` is the right card in the bottom row.

### Layout

- section label and title
- monthly bar chart as the primary visual
- small supporting summary beneath the chart

### Content

- monthly income bars
- numeric amounts rendered in `DM Mono`
- support summary such as:
  - highest earning month
  - current month total
  - trailing average or released total

### Design Rules

- restrained chart styling
- no gradients
- freelancer accent color for primary bars
- optional softer neutral bars only if comparison is needed

## States And Interactions

### Loading

- stat-card skeletons
- placeholder active work cards
- muted calendar shell
- muted chart shell
- stable dimensions to avoid layout shift

### Empty States

- `Active work`: `No active jobs yet`
- `Upcoming deadlines`: `No deadlines scheduled`
- `Income history`: `No earnings history yet`

### Error Handling

Each section should fail independently.

- jobs can show an inline error without hiding the rest of the dashboard
- deadlines can show an unavailable message without collapsing the layout
- income can show a chart-unavailable state without affecting active work

### Interaction Summary

- active job cards follow the accent hover treatment
- `Open current milestone` is the primary CTA for each work card
- deadline dates with items use accent highlighting
- the chart should remain readable without relying on hover

## Data Mapping

The redesign should prefer existing dashboard data where possible.

- stat cards derive from freelancer job and income APIs
- active work derives from assigned and under-review freelancer jobs
- upcoming deadlines derive from active milestone due dates
- recommended jobs stat can derive from the existing recommendation count without rendering the recommendation list on this page
- income history derives from freelancer earnings and released milestone data already exposed in the product

## Testing

### UI Coverage

- dashboard renders with all approved sections
- active work cards render for non-completed jobs only
- stat cards render with the expected labels
- empty states render correctly when each section has no data
- section-level error states render without collapsing the dashboard

### Visual Checks

- typography matches the dashboard reference rules
- card borders, radii, and spacing match the approved design language
- buttons and badges use the correct radius and accent treatment
- hover states on active work cards match the activity-card pattern

## Done Criteria

The dashboard redesign is complete when:

- the freelancer dashboard content matches the approved structure
- the page follows the `DashboardLayout.jsx` design language
- active work is the dominant section
- deadlines and income are visible in the bottom row
- recommended jobs are removed from the dashboard body
- loading, empty, and error states are implemented cleanly
