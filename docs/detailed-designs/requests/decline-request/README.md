# Decline a request

## Overview

Declining returns a request to the member with an optional reason. The request becomes Declined and its days go back to tentative on the member's row, so the member can move them or request again. The member is emailed the reason when decision emails are on.

**decline reason** — optional free text from the manager, shown to the member and kept with the request

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`DeclineRequestDialog`** — CDK Dialog in `app/dialogs/decline-request` with Reason (optional), "Keep pending" and "Decline request". A failure keeps the reason (`L2-025` AC4).
- **`ToastService`** — Shows "Declined Ben’s request" and "Ben has been emailed your reason." with Undo.
- **`RequestService / REQUEST_SERVICE`** — Contract and injection token in the `api` project: `mine()`, `list(status)`, `get(id)`, `send(request)`, `cancel(id)`, `approve(ids)`, `decline(id, reason)` and `reopen(id)`.

**Backend**

- **`RequestsController`** — `POST /api/requests/{id}/decline` behind the `Manager` policy; Undo uses `reopen`.
- **`DeclineRequestCommandHandler`** — Calls `TimeOffRequest.Decline(by, reason, now)`, sets the linked days to Tentative, commits and calls `RequestNotifier.RequestDecided`.
- **`DeclineRequestCommandValidator`** — Reason length limit: `<TO SUPPLY>`.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

**Request lifecycle.** A `TimeOffRequest` starts `Pending`. The manager moves it to `Approved` or `Declined`; the member moves a pending request to `Cancelled`. Undo after a decision calls `Reopen`, which returns it to `Pending`. Each transition updates the request's `TimeOffDay` rows in the same unit of work: Pending = Requested, Approved = Confirmed, Declined = Tentative (from the mocks' declined request, whose days show tentative), Cancelled = row removed.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-025` | `L1-005` | **Decline a request.** Declining returns the request to the member with an optional reason. |

## Diagrams

### System context

The manager declines requests in Greenlit, which emails the reason through the email provider.

![C4 system context for decline a request](diagrams/c4-context.png)

### Containers

The dialog sends the decision to the Greenlit API.

![C4 container view for decline a request](diagrams/c4-container.png)

### Components

`DeclineRequestCommandHandler` records the decision and the reason, then notifies the member.

![C4 component view for decline a request](diagrams/c4-component.png)

### Class structure

`TimeOffRequest.Decline` stores the reason and moves the covered days to `Tentative`.

![Class diagram for decline a request](diagrams/class-structure.png)

### Behaviour — decline a request

A blank reason declines without one (`L2-025` AC1, AC2); a failure leaves the request pending with the reason still typed (`L2-025` AC4).

![Sequence diagram: decline a request](diagrams/sequence-decline.png)
