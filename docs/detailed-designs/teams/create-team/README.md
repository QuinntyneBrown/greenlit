# Create a team

## Overview

A team is one sheet: a manager, the people whose days it shows, a time zone and the team's holidays. This feature creates a team in one form.

The manager names the team, picks a time zone and a public-holiday calendar, and lists the people on the sheet. Each name becomes a row at once; a person with an email also receives an invitation. The creator becomes the team's manager.

**time zone** — IANA zone in which Greenlit decides the date, so weekends and holidays fall on the right days

**public-holiday calendar** — country whose public holidays Greenlit copies into the team's holidays, or none

`<TO SUPPLY>`: how a person reaches this page, given that sign-in is invite-only (`L2-001`). The mocks show the page but no entry point.

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`CreateTeamPage`** — Bare-shell page (`page: 'create-team'`). It holds a growing list of member rows ("Add another member") and shows the errors "Give your team a name" and "Give this member a name" beside the fields at fault.
- **`TeamService / TEAM_SERVICE`** — `create(request)` returns the new team and a session for its manager.

**Backend**

- **`TeamsController`** — `POST /api/teams`.
- **`CreateTeamCommand / CreateTeamCommandHandler`** — Creates the `Team`, the creator's `TeamMember` with role Manager, one `TeamMember` per named row, the holidays from `IPublicHolidayProvider`, and one `Invitation` per row with an email. All writes share one unit of work, so a failure saves nothing (`L2-008` AC6). Invitations are emailed after the commit.
- **`CreateTeamCommandValidator`** — Requires a team name, a time zone from the offered list, and a name on every row that has an email.
- **`IPublicHolidayProvider`** — Returns a country's public holidays for a year. The source is `<TO SUPPLY>`; a static data file in Greenlit.Infrastructure is one option.
- **`Team, TeamMember, Holiday`** — Existing entities, extended with the settings fields shown in the class diagram.
- **`IEmailSender`** — Greenlit.Application abstraction introduced by this design, implemented in Greenlit.Infrastructure. It sends one templated email; the provider is `<TO SUPPLY>`.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

**Time-zone options.** The mocks offer London (GMT+0 / BST), Dublin, Paris, Berlin (CET) and New York (ET). They map to `Europe/London`, `Europe/Dublin`, `Europe/Paris`, `Europe/Berlin` and `America/New_York`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-008` | `L1-002` | **Create a team.** A manager sets up a team and its rows in one form. |

## Diagrams

### System context

The manager sets up a team in Greenlit, which reads public holidays from a holiday source and sends invitations through the email provider.

![C4 system context for create a team](diagrams/c4-context.png)

### Containers

The form posts one request to the Greenlit API, which writes the whole team in one transaction.

![C4 container view for create a team](diagrams/c4-container.png)

### Components

`CreateTeamCommandHandler` gathers the holidays, writes the team and its rows, and sends the invitations after the commit.

![C4 component view for create a team](diagrams/c4-component.png)

### Class structure

The design extends the existing `Team` and `TeamMember` entities with settings, roles and working days, and adds the `WorkingDays` flags.

![Class diagram for create a team](diagrams/class-structure.png)

### Behaviour — create a team with its rows

Validation failures stop the request before any write (`L2-008` AC4). The single unit of work gives "Nothing was saved, so you can try again" its meaning (`L2-008` AC6).

![Sequence diagram: create a team with its rows](diagrams/sequence-create.png)
