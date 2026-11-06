# View the team's month

## Overview

The calendar is the product: one month of the team on one screen, laid out like the spreadsheet it replaces. Members run down the side, days across the top with weekday initials and day numbers. Each cell is one member's day and shows its state in colour, glyph and accessible name.

Two summaries frame the grid. The Left column gives each member's days left for the year. The Out row gives, for each day, how many people are out and how many are in, and flags days below the coverage minimum.

**cell** — one member's day in the grid; a working day, a non-working day (red), or a day with a `DayStatus`

**non-working day** — weekend, team holiday or a day outside the member's working days; red, never stored as a `TimeOffDay`

**out** — member whose day is requested or confirmed; **in** — member who works that day and is not out

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`CalendarPage`** — App-shell page at `/` (`page: 'calendar'`). It replaces today's `SheetPage` at `/sheet`; `<TO SUPPLY>`: whether `/sheet` redirects. It owns the month cursor, the "Previous month", "Next month" and "Today" controls, and the loading, empty and error states.
- **`TeamGrid`** — `gl-team-grid` component: a `role="grid"` table labelled "Time off, {Month yyyy}" with column headers "Mon 2 Nov", one row per member, the Left column and the Out row. The signed-in member's row comes first, marked "You".
- **`SheetCell`** — `gl-sheet-cell` component. It renders the colour, the glyph ("?", "…", "✓") and the accessible name "{member}, {Day d Mon}: {state}", where state is Working, Not working, a holiday name, Tentative, Requested or Confirmed.
- **`OutCell`** — Shows "{n}" or "·" and the accessible name "{n} out, {m} in", adding ". Below the minimum of {min}" with an outline when flagged.
- **`SheetService / SHEET_SERVICE`** — Contract and injection token in the `api` project: `month(yyyyMm)`, `setDays(change)` and `restore(snapshot)`. `HttpSheetService` is the implementation bound in `app.config.ts`.

**Backend**

- **`SheetController`** — `GET /api/sheet?month=2026-11`.
- **`GetMonthQueryHandler`** — Loads the caller's team, its active members, their `TimeOffDay` rows in the month and the team's holidays in one round trip (ADR-003). It resolves each cell through `WeekendRule`, the Left figures through `AllowanceCalculator` (`allowances/allowance-figures`), and the Out row through `CoverageCalculator` (`teams/coverage-minimum`).
- **`MonthDto`** — Response: `Month`, `Today`, `IsManager`, `CoverageMinimum`, `Members` (each with `Id`, `Name`, `Initials`, `IsYou`, `DaysLeft`, `Cells`), `Coverage` (per date `Out`, `In`, `BelowMinimum`).
- **`ICurrentUser`** — Greenlit.Application abstraction introduced by this design. It exposes the caller's `UserId`, `TeamId`, `TeamMemberId` and `IsManager` from the JWT claims, so every handler scopes data to the caller's team.
- **`IClock`** — Greenlit.Application abstraction introduced by this design. It returns the current instant and the team's local date, so tests fix "today".

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-012` | `L1-003` | **Month sheet.** The calendar shows one month for the whole team. |
| `L2-013` | `L1-003` | **Day cells.** Each cell shows one member's day. |
| `L2-014` | `L1-003` | **Days left and the Out row.** The calendar shows each member's days left and a daily count of who is out. |
| `L2-042` | `L1-010` | **Coverage flags.** Days below the minimum are flagged. |
| `L2-048` | `L1-013` | **State carried by more than colour.** A cell's state is always in text, glyph or accessible name too. |

## Diagrams

### System context

Managers and members view the same month in Greenlit; no external system takes part.

![C4 system context for view the team's month](diagrams/c4-context.png)

### Containers

The calendar page loads one month from the Greenlit API, which reads it from the Greenlit database in one query.

![C4 container view for view the team's month](diagrams/c4-container.png)

### Components

`GetMonthQueryHandler` combines the stored days with `WeekendRule`, `AllowanceCalculator` and `CoverageCalculator`; the grid components only render.

![C4 component view for view the team's month](diagrams/c4-component.png)

### Class structure

`MonthDto` holds one `MemberRowDto` per member and one `CellDto` per day; `CellKind` separates red days from time off, so a cell never needs a stored row to be red.

![Class diagram for view the team's month](diagrams/class-structure.png)

### Behaviour — load and render a month

The member's own row comes first (`L2-012` AC2). Each cell carries its state in its accessible name and glyph as well as its colour (`L2-013`, `L2-048`). Days below the minimum are outlined on the Out row (`L2-042` AC1).

![Sequence diagram: load and render a month](diagrams/sequence-load-month.png)
