# Compute allowances

## Overview

Each member has a yearly allowance of days off. Greenlit computes from it how many days the member has used, booked, requested and left, and every screen that shows a number (the calendar's Left column, the year table, the person page, the request dialog) uses the same calculation.

Settings holds the defaults for new people in its Allowances section: days per year, the month the leave year starts, and the maximum carry-over. A member with no yearly days of their own uses the default, and a banner tells the manager when that is the case.

**allowance** — member's yearly days plus their adjustments for one leave year

**leave year** — twelve months starting on the first day of `Team.LeaveYearStartMonth`

**over allowance** — state in which a member's days left minus their requested days is below zero

`<TO SUPPLY>`: how Max carry-over applies at the end of a leave year. The mocks show the field and a manual "Carried over from 2025" adjustment, but no year-end step.

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`AllowancesSection`** — Settings section with Days per year, Leave year starts (January to December) and Max carry-over. A negative Days per year shows "Enter 0 or more days."
- **`MissingAllowanceBanner`** — Settings banner "Two members have no allowance set" with "They’re using the default of 25 days until you change it."

**Backend**

- **`SettingsController`** — `PUT /api/team/settings/allowances`.
- **`SaveAllowanceDefaultsCommandHandler`** — Saves `Team.DefaultYearlyDays`, `Team.LeaveYearStartMonth` and `Team.MaxCarryOver`; the validator rejects negative values (code `must_be_zero_or_more`).
- **`AllowanceCalculator`** — Domain service that computes an `Allowance` for a member and a `LeaveYear`, using `WeekendRule` to count only working days. It is the single source of every allowance figure.
- **`GetTeamSettingsQueryHandler`** — Adds `MembersWithoutAllowance` for the banner.
- **`IClock`** — Greenlit.Application abstraction introduced by this design. It returns the current instant and the team's local date, so tests fix "today".

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

**Figures.** For a member and a leave year, with "today" in the team's time zone. Only working days for that member count; weekends, holidays and their non-working days never count (`L2-029` AC5).

| Figure | Definition |
|---|---|
| Yearly days | `TeamMember.YearlyDays`, or `Team.DefaultYearlyDays` when null |
| Adjustments | Sum of `AllowanceAdjustment.Days` effective in the year |
| Allowance | Yearly days + Adjustments |
| Used | Confirmed days before today |
| Booked | Confirmed days from today on |
| Requested | Days of pending requests |
| Tentative | Tentative days |
| Left | Allowance − Used − Booked |
| Left after requests | Left − Requested; the member is *over* when it is below 0 |

**Decision record.** ADR-003 states that balances are out of scope. The requirements in `docs/specs` (from the mocks) introduce allowances, so this subsystem needs a new ADR that supersedes that clause before implementation: `<TO SUPPLY>`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-027` | `L1-006` | **Allowance defaults.** Settings sets the defaults for new people. |
| `L2-029` | `L1-006` | **Allowance figures.** Greenlit computes each member's allowance for the leave year. |
| `L2-030` | `L1-006` | **Over-allowance warnings.** Greenlit flags when requests would take a member below zero days left. |

## Diagrams

### System context

Managers set the defaults and everyone reads the figures in Greenlit.

![C4 system context for compute allowances](diagrams/c4-context.png)

### Containers

The Allowances section saves defaults; every page that shows a figure receives it from the Greenlit API.

![C4 container view for compute allowances](diagrams/c4-container.png)

### Components

`AllowanceCalculator` is the only component that computes allowance figures; query handlers across the system call it.

![C4 component view for compute allowances](diagrams/c4-component.png)

### Class structure

An `Allowance` is computed, never stored, from `Team` defaults, `TeamMember.YearlyDays`, `AllowanceAdjustment` rows and the member's days in a `LeaveYear`.

![Class diagram for compute allowances](diagrams/class-structure.png)

### Behaviour — compute a member's allowance

The steps match the figures table: Left excludes requested days, and Left after requests decides the over-allowance warning (`L2-029` AC4, `L2-030`).

![Sequence diagram: compute a member's allowance](diagrams/sequence-compute.png)
