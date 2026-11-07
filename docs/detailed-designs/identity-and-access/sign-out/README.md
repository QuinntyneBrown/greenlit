# Use the account menu and sign out

## Overview

The avatar at the right of the header opens the account menu. The menu names the signed-in person and their role, and links to their own person page, the Account page, the brand guide and sign-out.

Signing out asks for confirmation in a dialog. Greenlit also ends a session that has expired and sends the person to a page that offers to sign in again and return to where they were.

**account menu** — menu attached to the header avatar, following the WAI-ARIA menu button pattern

**session expiry** — point at which the session token stops being accepted; its duration is eight hours from sign-in (ADR-004)

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`UserMenu`** — `gl-user-menu` in `frontend/projects/components`, built on the CDK Menu: the avatar button (`aria-haspopup="menu"`, `aria-expanded`, `aria-label="Account menu for {name}"`) and the `.menu` panel in a CDK overlay. "My time off", "Account" and "Brand guide" lead to `/person`, `/account` and `/brand`; those screens arrive with their own journeys (until then they show not found). Enter, Space or ArrowDown on the button opens it and focuses the first item; arrow keys, Home and End move between items; Escape and Tab close it, and Escape returns focus to the avatar. The panel names the person ("Maya Chen", "Manager · maya@northwind.studio") and lists "My time off", "Account", "Brand guide" and "Sign out". The shell reads who is signed in from `AUTH_SERVICE.account()` and places the menu in the top bar's `[slot=end]`.
- **`SignOutDialog`** — CDK Dialog in `app/dialogs/sign-out`. "Stay signed in" closes it. "Sign out" shows "Signing out…" (`aria-busy`, every way out off) while `AUTH_SERVICE.signOut()` runs, then the session is cleared and the app navigates to sign-in.
- **`HttpAuthService`** — `signOut()` calls `POST /api/auth/sign-out` and clears the stored token whether or not the call succeeds: the person asked to leave, so a failed call never keeps them signed in.
- **Session expiry** — Two paths lead to the session-expired page. `authGuard` finds a stored token that is no longer live; the `sessionExpiredInterceptor` in `api` sees a `401` with code `session_expired` on a call to the Greenlit API. Both clear the token and navigate to `/session-expired?returnUrl={current url}`.
- **`SessionExpiredPage`** — Bare-shell page (`page: 'session-expired'`). Its "Sign in" link goes to `/sign-in?returnUrl={returnUrl}`; sign-in already returns the person to `returnUrl` (sign-in design), so no separate store keeps the URL.

**Backend**

- **`AuthController`** — `GET /api/auth/me` returns `{ displayName, email, role }` of the caller (authenticated, fallback policy); `POST /api/auth/sign-out` returns `204` for an authenticated caller. Both are authenticated by the fallback policy; neither is `[AllowAnonymous]`, and neither reveals anything about any person but the caller.
- **Sign-out and revocation** — Decided: sign-out does **not** revoke the token. ADR-004 keeps no server-side session store and no refresh token, and a stateless bearer cannot be revoked without one. The endpoint logs the sign-out (user id only) and the client discards the token; a copy of the token taken earlier stays valid until its eight hours end, the risk ADR-004 already accepts.
- **`JwtBearer events`** — `OnChallenge` answers an expired token with a ProblemDetails `401` and `code: session_expired`. A missing, malformed or wrongly signed token keeps the plain `401`, so the code reveals nothing but that this token was once valid and has lapsed.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-006` | `L1-001` | **User menu and sign out.** The avatar in the header opens the account menu; signing out asks for confirmation. |
| `L2-007` | `L1-001` | **Session expiry.** A session that has expired sends the person to sign in again. |

## Diagrams

### System context

A signed-in team user signs out of Greenlit; no external system takes part.

![C4 system context for use the account menu and sign out](diagrams/c4-context.png)

### Containers

The web application ends the session and tells the Greenlit API; the API rejects expired tokens.

![C4 container view for use the account menu and sign out](diagrams/c4-container.png)

### Components

The menu opens the sign-out dialog; an expired token reaches `SessionStore` as a `401` and leads to the session-expired page.

![C4 component view for use the account menu and sign out](diagrams/c4-component.png)

### Class structure

The slice is mostly frontend: `SessionStore` owns the token; the return URL travels as the `returnUrl` query parameter of the session-expired and sign-in pages (the diagram shows it on the store).

![Class diagram for use the account menu and sign out](diagrams/class-structure.png)

### Behaviour — sign out from the account menu

"Stay signed in" closes the dialog and keeps the session (`L2-006` AC4).

![Sequence diagram: sign out from the account menu](diagrams/sequence-sign-out.png)

### Behaviour — recover from an expired session

The return URL saved at expiry brings the person back to the page they were on (`L2-007` AC2).

![Sequence diagram: recover from an expired session](diagrams/sequence-session-expired.png)
