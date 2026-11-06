# View the team's year

## Overview

The year page shows the whole team's year in one view. A grid has one row per member and one column per month, each cell giving the confirmed days off in that month; selecting a month opens the calendar on it.

Below the grid, a table gives each person's allowance for the year: Allowance, Used, Booked, Requested, Left and a usage bar. Sorting by days left, most first, shows who has not had a break.

`<TO SUPPLY>`: the mocks show this table to members as well as the manager, while the person page tells members that only managers see everyone's allowance (`L2-035` AC1). This design follows the year mocks.

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`YearPage`** — App-shell page (`page: 'year'`) with "Previous year" and "Next year", the legend, the `gl-year-grid` "Time off by month" and the allowance `gl-table` with the sort control "Most days left first".
- **`YearGrid`** — Cells named "{member}, {Month}: {n} confirmed days off"; activating one navigates to the calendar for that month.
- **`YearService / YEAR_SERVICE`** — `year(yyyy)`.

**Backend**

- **`YearController`** — `GET /api/year?year=2026`.
- **`GetYearQueryHandler`** — Groups the team's confirmed days by member and month in one query and computes each member's `Allowance` for the leave year. The signed-in member's row comes first.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-031` | `L1-007` | **Year grid.** The year page shows the whole team's confirmed time off month by month. |
| `L2-032` | `L1-007` | **Allowance table on the year page.** Below the grid, a table shows each person's allowance for the year. |

## Diagrams

### System context

Everyone on the team views the year in Greenlit.

![C4 system context for view the team's year](diagrams/c4-context.png)

### Containers

The year page loads one `YearDto` from the Greenlit API.

![C4 container view for view the team's year](diagrams/c4-container.png)

### Components

`GetYearQueryHandler` aggregates confirmed days by month and asks `AllowanceCalculator` for each row's figures.

![C4 component view for view the team's year](diagrams/c4-component.png)

### Class structure

Each `YearRowDto` has twelve monthly counts and an `Allowance`; sorting happens on the client.

![Class diagram for view the team's year](diagrams/class-structure.png)

### Behaviour — load the year and open a month

Sorting by Left is a client-side reorder (`L2-032` AC3). Selecting a month cell opens the calendar on that month (`L2-031` AC3).

![Sequence diagram: load the year and open a month](diagrams/sequence-load-year.png)
