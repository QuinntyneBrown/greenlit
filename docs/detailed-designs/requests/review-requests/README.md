# Review requests

## Overview

For the manager, the Requests page is the team's ledger. Tabs split it into Pending, Approved and Declined, each with its count, and the main navigation shows the pending count on every page. Each pending entry shows the person, the dates, the note and the overlaps, with Decline and Approve.

Opening a request shows its detail: status, when it was sent, the days the member has left after it, the note, and the team for the weeks around it with the Out row. The manager may also tick several pending requests and approve them together.

**ledger** — manager's list of every request on the team, grouped by status

**team those weeks** — grid of every member for the request's dates, with the Out row, shown in the request detail

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`RequestsPage`** — For the manager it renders the `gl-tabs` Pending, Approved and Declined with counts, the "Select all" checkbox and "Approve {n}", and one `gl-request-row` per request. The empty text is "Nothing waiting. Everyone's greenlit."
- **`RequestDetailDialog`** — CDK Dialog in `app/dialogs/request-detail`. Its body scrolls while the actions stay fixed (`L2-023` AC4). Pending requests offer Decline and Approve.
- **`AppNav`** — `gl-app-nav` shows "{n} pending" on Requests for the manager only, from `GET /api/requests/pending-count`.
- **`RequestService / REQUEST_SERVICE`** — Contract and injection token in the `api` project: `mine()`, `list(status)`, `get(id)`, `send(request)`, `cancel(id)`, `approve(ids)`, `decline(id, reason)` and `reopen(id)`.

**Backend**

- **`RequestsController`** — `GET /api/requests?status=`, `GET /api/requests/{id}`, `GET /api/requests/pending-count` and `POST /api/requests/approve` (bulk), behind the `Manager` policy.
- **`ListRequestsQueryHandler`** — Returns the team's requests in one status with counts for all three tabs; the Declined tab includes cancelled requests (`L2-022` AC4).
- **`GetRequestQueryHandler`** — Returns the request, the member's `DaysLeftAfter`, and the team grid for the request's weeks built by `GetMonthQueryHandler`'s cell logic and `CoverageCalculator`.
- **`ApproveRequestsCommandHandler`** — Approves each listed request as in `requests/approve-request`, in one unit of work.
- **`Note-change notice`** — When the member edits the note while the dialog is open, the page shows "Ana updated her note". `<TO SUPPLY>`: the transport for that notice (polling or a push channel) and where a member edits a note, which no mock shows.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-022` | `L1-005` | **Requests ledger for the manager.** The manager sees every request on the team by status. |
| `L2-023` | `L1-005` | **Request detail.** Opening a request shows its details and the team around it. |
| `L2-026` | `L1-005` | **Approve requests in bulk.** The manager approves several pending requests at once. |

## Diagrams

### System context

The manager reviews the team's requests in Greenlit.

![C4 system context for review requests](diagrams/c4-context.png)

### Containers

The ledger, the detail and the navigation count each read from the Greenlit API.

![C4 container view for review requests](diagrams/c4-container.png)

### Components

Two query handlers serve the ledger and the detail; the bulk command reuses the single approval rules.

![C4 component view for review requests](diagrams/c4-component.png)

### Class structure

`RequestDetailDto` reuses the sheet's `MemberRowDto` and `DayCoverage` for the team view, so it flags the same days as the calendar (`L2-042` AC3).

![Class diagram for review requests](diagrams/class-structure.png)

### Behaviour — approve ticked requests together

The bulk action shows the number ticked (`L2-026` AC1) and approves each as a single approval would (`L2-026` AC3).

![Sequence diagram: approve ticked requests together](diagrams/sequence-bulk-approve.png)
