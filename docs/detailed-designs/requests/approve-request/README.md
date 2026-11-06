# Approve a request

## Overview

Approving a request confirms its days: the request becomes Approved, its yellow days turn green, and the member is emailed when decision emails are on. A toast confirms the approval and offers Undo, which returns the request to Pending.

When the approval leaves fewer people in than the coverage minimum on any day, the toast says so. The approval still stands; the warning informs the manager.

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`RequestRow / RequestDetailDialog`** — Both call `approve([id])`; the dialog shows "Approving…" while busy and "Try approving again" on failure.
- **`ToastService`** — Shows "Approved Ana’s time off", or "Approved, but only {n} people will be in on {date}" with "That’s below your minimum of {min}.", each with Undo.
- **`RequestService / REQUEST_SERVICE`** — Contract and injection token in the `api` project: `mine()`, `list(status)`, `get(id)`, `send(request)`, `cancel(id)`, `approve(ids)`, `decline(id, reason)` and `reopen(id)`.

**Backend**

- **`RequestsController`** — `POST /api/requests/approve` (one or many ids) and `POST /api/requests/{id}/reopen` for Undo.
- **`ApproveRequestsCommandHandler`** — Calls `TimeOffRequest.Approve`, sets the linked days to Confirmed with `ConfirmedUtc`, commits, asks `CoverageCalculator` for the first date below the minimum in the range, and calls `RequestNotifier.RequestDecided`.
- **`ReopenRequestCommandHandler`** — Calls `TimeOffRequest.Reopen` and returns the days to Requested. `<TO SUPPLY>`: whether Undo sends a follow-up email after the member was told.
- **`CoverageCalculator`** — Defined in `teams/coverage-minimum`.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

**Request lifecycle.** A `TimeOffRequest` starts `Pending`. The manager moves it to `Approved` or `Declined`; the member moves a pending request to `Cancelled`. Undo after a decision calls `Reopen`, which returns it to `Pending`. Each transition updates the request's `TimeOffDay` rows in the same unit of work: Pending = Requested, Approved = Confirmed, Declined = Tentative (from the mocks' declined request, whose days show tentative), Cancelled = row removed.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-024` | `L1-005` | **Approve a request.** Approving confirms the request's days. |
| `L2-042` | `L1-010` | **Coverage flags.** Days below the minimum are flagged. |

## Diagrams

### System context

The manager approves requests in Greenlit, which emails the member through the email provider.

![C4 system context for approve a request](diagrams/c4-context.png)

### Containers

The approval is one call to the Greenlit API; Undo is a second call that reopens the request.

![C4 container view for approve a request](diagrams/c4-container.png)

### Components

The handler confirms the days, checks coverage, then notifies; the toast reads the coverage result.

![C4 component view for approve a request](diagrams/c4-component.png)

### Class structure

`ApprovalResult` carries the first short date, which turns the success toast into the coverage warning.

![Class diagram for approve a request](diagrams/class-structure.png)

### Behaviour — approve a request

Coverage below the minimum changes the toast, not the outcome (`L2-042` AC2). Undo returns the request to Pending and its days to Requested (`L2-024` AC3).

![Sequence diagram: approve a request](diagrams/sequence-approve.png)
