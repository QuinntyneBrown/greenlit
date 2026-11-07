# Set the coverage minimum

## Overview

Coverage is the fewest people who should be in on any working day. The manager sets it in Settings with a stepper bounded by 0 and the team size. Greenlit then flags days below the minimum on the calendar's Out row, in the request dialog and when the manager approves a request (`sheet/view-month`, `requests/approve-request`).

**coverage minimum** — smallest number of members who should be working on a working day; stored as `Team.CoverageMinimum`

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`CoverageSection`** — In Settings, for the manager only. Shows the `gl-counter` stepper ("Fewer people", value, "More people", "of {team size} people in") clamped to 0 and the team size, and its own "Save changes" (disabled until the value differs from the saved one; "Saving…", then "Saved"; a failure keeps the value and offers Try again in a toast).
- **Calendar and `RequestDetailDialog`** — Already render the flag from the month's `coverage` (`belowMinimum`) and `coverageMinimum`: the Out cell is outlined and named "{n} out, {m} in. Below the minimum of {min}".

**Backend**

- **`TeamSettingsController`** — `PUT /api/team/settings/coverage` (manager only) takes `{ minimum }`; `GET /api/team/settings` also returns `coverageMinimum` and `teamSize`.
- **`SaveCoverageCommandHandler`** (Application/Teams) — Saves `Team.CoverageMinimum`. The validator rejects a missing value, below 0, or above the team size (`errors.Minimum`, 400).
- **`CoverageFlag`** — Application rule shared by the month query and the request detail query: a working day is `BelowMinimum` when the minimum is above 0 and the people in (Working or Tentative cells) are fewer than it. The approval check (`CoverageCalculator`) uses the same minimum; the approval always stands.

**API shapes.** `PUT /api/team/settings/coverage` body `{ "minimum": 4 }` answers the settings (200). A missing, negative or too-large minimum answers 400 with `errors.Minimum = ["Choose between 0 and {team size} people."]` and saves nothing; a member answers 403; the caller's own team is the only team ever read or written. The month and request detail answer `coverageMinimum` (null when the minimum is 0) and per-day `belowMinimum`.

**Decisions.** A minimum of 0 means no minimum: nothing is flagged and `coverageMinimum` is null on the sheet. The upper bound is the number of members on the team (the mock's "of 7 people in"). Lowering the team below the minimum later does not rewrite it; the stepper clamps on the next edit. Errors reveal only the bounds the manager already sees on screen.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-041` | `L1-010` | **Coverage minimum.** The manager sets the fewest people who must be in. |
| `L2-042` | `L1-010` | **Coverage flags.** Days below the minimum are flagged on the Out row, in the request dialog and when approving. |

## Diagrams

### System context

The manager sets coverage in Greenlit; no external system takes part.

![C4 system context for set the coverage minimum](diagrams/c4-context.png)

### Containers

The Coverage section saves the minimum through the Greenlit API.

![C4 container view for set the coverage minimum](diagrams/c4-container.png)

### Components

One handler stores the minimum; `CoverageCalculator` uses it wherever days are counted.

![C4 component view for set the coverage minimum](diagrams/c4-component.png)

### Class structure

`CoverageCalculator` turns the team's days into `DayCoverage` values for any date range.

![Class diagram for set the coverage minimum](diagrams/class-structure.png)

### Behaviour — save the coverage minimum

The stepper never leaves 0 to team size (`L2-041` AC2), and the validator enforces the same bounds.

![Sequence diagram: save the coverage minimum](diagrams/sequence-save-coverage.png)
