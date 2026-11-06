# View a person's page

## Overview

Each member has a person page that summarises their year: their allowance figures, a year at a glance of twelve small month calendars, their upcoming time off and the time off taken this year. A member reaches their own page through "My time off" and can request time off from it.

The manager sees the same page for every member, with three more sections: Allowance adjustments, Working days and Remove from team. A member who opens someone else's page sees that only their own details are visible.

**year at a glance** — twelve month calendars for one member, coloured by day status

**run** — consecutive working days of one member with the same status, listed as one entry ("13–24 Jul 10 days Confirmed")

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`PersonPage`** — App-shell page (`page: 'person'`) at `/people/{id}`. It shows the header (name, job title, "Joined {Mon yyyy}", non-standard working days), "{n} days left in {year}" with the over-allowance text, the `gl-stat` figures, the `gl-month-mini` year, Upcoming and Taken lists, and the manager sections. It handles the forbidden, not-found and error states.
- **`PersonService / PERSON_SERVICE`** — `get(id)` plus the actions of `allowances/adjust-allowance`, `teams/working-days` and `teams/remove-member`.

**Backend**

- **`PeopleController`** — `GET /api/people/{id}`.
- **`GetPersonQueryHandler`** — Allows the manager for any member of the team and a member for themselves only (`ForbiddenException`, code `own_details_only`); a removed or unknown id raises `NotFoundException`. It returns the figures from `AllowanceCalculator`, the year's cells, runs grouped by `RunBuilder`, and, for the manager, the adjustments and working days.
- **`RunBuilder`** — Domain helper that groups consecutive working days with the same status into runs, skipping non-working days.
- **`TeamMember.JobTitle, TeamMember.JoinedOn`** — New fields. `<TO SUPPLY>`: where they are entered; no mock shows a form for them.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-033` | `L1-008` | **Person page.** Each member has a page summarising their year. |
| `L2-034` | `L1-008` | **Manager actions on the person page.** The manager manages a member from their page. |
| `L2-035` | `L1-008` | **Person page access.** Members see only their own person page. |

## Diagrams

### System context

The manager views and manages any member, and a member views their own page, in Greenlit.

![C4 system context for view a person's page](diagrams/c4-context.png)

### Containers

The person page loads one `PersonDto` from the Greenlit API; its actions belong to other features.

![C4 container view for view a person's page](diagrams/c4-container.png)

### Components

`GetPersonQueryHandler` enforces who may see the page, then assembles figures and runs.

![C4 component view for view a person's page](diagrams/c4-component.png)

### Class structure

`CanManage` tells the page whether to show the manager sections; `Adjustments` is read-only for a member viewing themselves.

![Class diagram for view a person's page](diagrams/class-structure.png)

### Behaviour — open a person page

A member sees only their own page (`L2-035` AC1); a removed member's page is not found (`L2-035` AC2). The manager sections appear only when `CanManage` is true (`L2-034`).

![Sequence diagram: open a person page](diagrams/sequence-open-person.png)
