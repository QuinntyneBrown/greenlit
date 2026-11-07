# Sign in

## Overview

Greenlit is a shared time-off sheet for a small team. Every page except the sign-in, password and invitation pages requires a signed-in user, because each request is scoped to the caller's team.

This feature covers the sign-in page. A person enters an email address and a password. Greenlit checks them against the stored account and, on success, issues a session and opens the calendar. Greenlit is invite-only, so the page offers no self sign-up; it tells a newcomer to ask a manager for an invitation.

**session** — signed JWT bearer token that identifies the user, their team and their role until it expires

**invite-only** — property of Greenlit whereby accounts exist only for people a manager has invited

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`SignInPage`** — Angular page at the bare shell (`data: { shell: 'bare', page: 'sign-in' }`). It renders the form, the error summary and the success panel from `docs/mocks/pages/sign-in/*`, and navigates to the calendar after "Signed in".
- **`AuthService / AUTH_SERVICE`** — Contract and injection token in the `api` project. `signIn(email, password)` returns the session or a typed failure; the HTTP implementation `HttpAuthService` stores the token.
- **`SessionStore`** — Holds the current token and user summary in memory and in browser storage; an HTTP interceptor adds the `Authorization: Bearer` header.

**Backend**

- **`AuthController`** — Greenlit.Api controller with `POST /api/auth/sign-in`, marked `[AllowAnonymous]`.
- **`SignInCommand / SignInCommandHandler`** — MediatR request and handler. The handler loads the `User` by normalised email, verifies the password hash, and returns a `SessionDto`. A wrong email and a wrong password both raise the same failure, code `invalid_credentials`.
- **`SignInCommandValidator`** — Rejects an empty email ("Enter your email address.") or an empty password ("Enter your password.").
- **`IPasswordHasher`** — Greenlit.Application abstraction, implemented in Greenlit.Infrastructure with ASP.NET Core Identity's `PasswordHasher<User>`.
- **`ITokenService`** — Issues the JWT from the existing `JwtOptions` with the claims `sub`, `team_id`, `team_member_id` and `role`. Token lifetime: eight hours (`JwtOptions.AccessTokenMinutes` = 480, ADR-004).
- **`User`** — Existing entity (`Id`, `Email`, `DisplayName`, `PasswordHash`, `Role`, `CreatedUtc`).

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-001` | `L1-001` | **Sign in.** A person signs in with email and password. Greenlit is invite-only, and the sign-in page says so. |

## Diagrams

### System context

A visitor signs in to Greenlit. No external system takes part.

![C4 system context for sign in](diagrams/c4-context.png)

### Containers

The sign-in page posts the credentials to the Greenlit API, which reads the user from the Greenlit database.

![C4 container view for sign in](diagrams/c4-container.png)

### Components

`AuthController` sends a `SignInCommand`; the handler verifies the password through `IPasswordHasher` and issues the token through `ITokenService`. `SessionStore` keeps the token for later requests.

![C4 component view for sign in](diagrams/c4-component.png)

### Class structure

`SignInCommandHandler` loads the existing `User` entity and returns a `SessionDto`; the hashing and token services are abstractions with Infrastructure implementations.

![Class diagram for sign in](diagrams/class-structure.png)

### Behaviour — sign in with email and password

The validator rejects empty fields before the handler runs (`L2-001` AC2). A mismatch returns `invalid_credentials`, which the page shows as "Email or password doesn't match" without saying which field was wrong (`L2-001` AC3).

![Sequence diagram: sign in with email and password](diagrams/sequence-sign-in.png)

## Decisions (journey 2, 7 Nov 2026)

| Topic | Decision |
|---|---|
| Token lifetime and storage | One bearer JWT that lasts eight hours, a working day, with no refresh token (ADR-004). The `api` project's `LocalStorageSessionStore` keeps it under `greenlit.session`; the interceptor sends it to the Greenlit API only. Session expiry and sign-out are journey 20. |
| Endpoint and response | `POST /api/auth/sign-in` is the only `[AllowAnonymous]` action on `AuthController`. Success is `200` with `SessionDto` (`accessToken`, `expiresUtc`, `userId`, `displayName`, `role`, `teamId`). The token carries `sub`, `role` and, when the user has a row on a team, `team_id` and `team_member_id`. |
| Wrong credentials | An unknown email, a wrong password and an account without a usable password hash all answer `401` ProblemDetails with code `invalid_credentials` and the detail "Email or password doesn't match." The handler verifies a dummy hash when no user matches, so the response time does not reveal whether the email has an account. The new `UnauthorizedException` in Greenlit.Application carries the code; `ExceptionHandlingMiddleware` maps it to `401`. |
| Empty fields | `400` validation ProblemDetails with "Enter your email address." on `Email` and "Enter your password." on `Password`. The page checks the same rules before it sends anything, so the API rule is the backstop. |
| Email matching | Emails are compared trimmed and case-insensitively; the stored address is unchanged. |
| Client validation | Fields validate on blur once, then on every change until valid (forms pattern). A submit attempt with errors shows the summary "Fix N things to continue", whose links focus the field, moves focus to the summary and sends nothing. |
| Busy and failed states | While the request runs, the button shows its spinner with `aria-busy="true"` and is disabled, and both fields are read-only (`pages/sign-in/submitting`). After `invalid_credentials` the form keeps both values, as `pages/sign-in/error` shows, and shows the danger alert. Any other failure (network, `5xx`) shows the same alert with "We couldn't sign you in" and "Something went wrong on our side. Try again in a moment."; it needs no mock of its own because only the copy differs from `pages/sign-in/error`. |
| Success | The card becomes `pages/sign-in/success`: "Signed in", "Welcome back, {first name}", "Taking you to your calendar…", an indeterminate progress bar labelled "Signing you in" and the "Go to the calendar now" link. The page navigates there after 1.5 seconds. |
| Return address and guard | `authGuard` sends a visitor without a session from any guarded route to `/sign-in?returnUrl=…`; after signing in they go back there. Only an app path (starting with one `/`) is honoured, so the parameter cannot redirect off-site; anything else means the calendar at `/`. A visitor who already has a session and opens `/sign-in` goes straight to the calendar. |
| Loading state | `pages/sign-in/loading` ("Checking your session…") is not reached in this journey: the session check is local and synchronous. Journey 20 uses it if it adds a server-side check. |
| Rate limiting | Not in this journey. The design does not ask for it, and the e2e suite signs in through the endpoint for every guarded test. Brute-force protection is an open question for the sign-out and account journeys. |
| Demo seed | `greenlit seed` gives every demo account the password `greenlit-demo` (13 characters, so it meets the reset-password rule of L2-003), hashed with ASP.NET Core Identity's `PasswordHasher<User>`. The seed only sets a hash that is still the old placeholder, so it stays idempotent and never overwrites a real password. |
| Calendar address | The calendar stays at `/` (L2-049); "lands on the calendar" means `/`. |

## Security and privacy

- **Who may call it.** `POST /api/auth/sign-in` is anonymous by design; every other endpoint keeps the authenticated fallback policy. The page itself is public; every app screen behind `authGuard` needs a session.
- **What an error reveals.** One code and one message for every credential failure, and an equalised hash check, so the endpoint cannot be used to find out which emails have accounts. Validation errors name only the empty field.
- **Team scoping.** The token names the caller's own team and row only; handlers still resolve the team from `sub`, so a forged `team_id` grants nothing.
- **Secrets.** Passwords are never logged (the logging behaviour logs request type names only) and never returned. The token is signed with `GREENLIT_JWT_SIGNING_KEY` outside Development.
