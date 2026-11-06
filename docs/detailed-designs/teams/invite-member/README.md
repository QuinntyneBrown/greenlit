# Invite a member

## Overview

The manager adds a person to an existing team from Settings. The person appears on the calendar as a row at once, before they accept, and receives an email with a link to set a password.

The invite dialog asks for a name, an email and a role. The link works for seven days; accepting it is covered by `identity-and-access/accept-invitation`.

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`InviteMemberDialog`** — CDK Dialog in `app/dialogs/invite-member`. It validates the name and email, shows "Sending…", and on success shows "Invite sent to {email}" with "Invite another" and "Done".
- **`TeamService / TEAM_SERVICE`** — `invite(name, email, role)`.

**Backend**

- **`MembersController`** — `POST /api/team/members` behind the `Manager` policy.
- **`InviteMemberCommandHandler`** — Adds the `TeamMember` at the end of the sort order, creates the `Invitation` with `ExpiresUtc` 7 days after sending, commits, then emails the link. If the email fails, the handler rolls back the member so "Nothing was added to the team" holds (`L2-010` AC4).
- **`InviteMemberCommandValidator`** — Requires a name ("Enter a name.") and a valid email ("Enter a valid email address, like name@company.com.").
- **`Invitation`** — Entity defined in `identity-and-access/accept-invitation`.
- **`IEmailSender`** — Greenlit.Application abstraction introduced by this design, implemented in Greenlit.Infrastructure. It sends one templated email; the provider is `<TO SUPPLY>`.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-010` | `L1-002` | **Invite a member.** The manager adds a person to the team by name and email; the person appears on the calendar at once and receives an email link to set a password. |

## Diagrams

### System context

The manager invites a person through Greenlit, which emails the link through the email provider.

![C4 system context for invite a member](diagrams/c4-context.png)

### Containers

The dialog posts the invitation to the Greenlit API, which writes the row and sends the email.

![C4 container view for invite a member](diagrams/c4-container.png)

### Components

`InviteMemberCommandHandler` writes the member and the invitation, then sends the email.

![C4 component view for invite a member](diagrams/c4-component.png)

### Class structure

An invitation hangs off the new `TeamMember`, whose role comes from the dialog.

![Class diagram for invite a member](diagrams/class-structure.png)

### Behaviour — invite a member

The new row appears on the calendar as soon as the request succeeds (`L2-010` AC3). A failed email removes the row again (`L2-010` AC4).

![Sequence diagram: invite a member](diagrams/sequence-invite.png)
