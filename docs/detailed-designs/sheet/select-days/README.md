# Select days and use the keyboard

## Overview

Select mode reverses Paint mode: the person marks a range first, then picks what to do with it. A bar labelled "Selected days" names the member and the range, counts the working days, warns when the range goes over allowance, and offers the actions.

Select mode is also the keyboard path into the grid. Every interaction that works with a pointer or touch works from the keyboard: Enter starts a selection on the focused cell, the arrow keys extend it, and Escape clears it.

**selection** — contiguous range of one member's cells chosen before an action

**roving focus** — grid focus model in which one cell holds `tabindex=0` and the arrow keys move it

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`SelectionController`** — Directive on `TeamGrid`. With a pointer it selects on click and drag; from the keyboard Enter anchors the selection and the arrow keys extend it within one row; Escape clears it. It keeps roving focus on the cells (WAI-ARIA grid pattern).
- **`SelectionBar`** — `gl-selection-bar` labelled "Selected days". It shows "{member} · {range}", "{n} days working", "{n} days over allowance" when the range exceeds the member's days left, the actions "Confirm" (manager only), "Request", "Tentative", "Clear", and "Clear selection".
- **`SkipLink`** — Existing `gl-skip-link` in the `components` project; it becomes the first focusable element and moves focus to the main content (`L2-047` AC3).
- **`SheetService / SHEET_SERVICE`** — Contract and injection token in the `api` project: `month(yyyyMm)`, `setDays(change)` and `restore(snapshot)`. `HttpSheetService` is the implementation bound in `app.config.ts`.

**Backend**

- **`SetDaysCommandHandler`** — Same command as `sheet/mark-days`: an action from the bar is a `SetDaysCommand` over the selected dates.
- **`GetMonthQueryHandler`** — Supplies each member's `DaysLeft`, from which the bar computes the overage on the client; the server does not block an over-allowance change (`L2-030` AC4).

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-016` | `L1-004` | **Select mode and the selection bar.** In Select mode the person picks a range first and then chooses what to do with it. |
| `L2-047` | `L1-013` | **Keyboard on the sheet.** Every sheet interaction works from the keyboard. |

## Diagrams

### System context

Managers and members select days in Greenlit from a pointer, touch or the keyboard.

![C4 system context for select days and use the keyboard](diagrams/c4-context.png)

### Containers

An action from the selection bar is one call to the Greenlit API, the same call that a paint stroke makes.

![C4 container view for select days and use the keyboard](diagrams/c4-container.png)

### Components

`SelectionController` owns the range; `SelectionBar` turns an action into a `SetDaysCommand`.

![C4 component view for select days and use the keyboard](diagrams/c4-component.png)

### Class structure

The frontend `SelectionState` computes the working-day count and the overage that the bar shows.

![Class diagram for select days and use the keyboard](diagrams/class-structure.png)

### Behaviour — select days from the keyboard

Enter and the arrow keys build the selection (`L2-047` AC1), and Escape clears it (`L2-016` AC4, `L2-047` AC2). A member's bar has no "Confirm" (`L2-016` AC2).

![Sequence diagram: select days from the keyboard](diagrams/sequence-keyboard-select.png)
