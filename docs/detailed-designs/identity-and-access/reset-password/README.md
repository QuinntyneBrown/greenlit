# Reset a forgotten password

## Overview

A person who has forgotten their password asks Greenlit for a reset link. Greenlit emails a link to the address if an account exists, and says the same thing either way so the page does not reveal which addresses have accounts.

The link opens a page where the person chooses a new password of at least 10 characters. A link works for one hour and only once.

**reset token** — single-use random secret embedded in the reset link; Greenlit stores only its hash, with an expiry one hour after issue

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`ForgotPasswordPage`** — Bare-shell page. It posts the email and shows "Check your email" or "We couldn't send the email".
- **`ResetPasswordPage`** — Bare-shell page that reads the token from the link. It validates length and confirmation client-side and shows "This link has expired" or "Password updated".
- **`AuthService / AUTH_SERVICE`** — Adds `requestPasswordReset(email)` and `resetPassword(token, password)`.

**Backend**

- **`AuthController`** — Adds `POST /api/auth/password-reset` and `POST /api/auth/password-reset/confirm`, both `[AllowAnonymous]`.
- **`RequestPasswordResetCommandHandler`** — Creates a `PasswordResetToken` for an existing user and emails the link. For an unknown address it returns the same success, so the response does not disclose the account.
- **`ResetPasswordCommandHandler`** — Hashes the presented token, finds an unused token not past `ExpiresUtc`, sets the new password hash and stamps `UsedUtc`. An expired or used token raises code `reset_link_expired`.
- **`ResetPasswordCommandValidator`** — Requires at least 10 characters and a matching confirmation.
- **`PasswordResetToken`** — New entity: `Id`, `UserId`, `TokenHash`, `ExpiresUtc`, `UsedUtc`.
- **`IClock`** — Greenlit.Application abstraction introduced by this design. It returns the current instant and the team's local date, so tests fix "today".
- **`IEmailSender`** — Greenlit.Application abstraction introduced by this design, implemented in Greenlit.Infrastructure. It sends one templated email; the provider is `<TO SUPPLY>`.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-002` | `L1-001` | **Forgot password.** A person asks for a password reset link by email. |
| `L2-003` | `L1-001` | **Reset password.** A reset link lets a person choose a new password once, within one hour. |

## Diagrams

### System context

A visitor resets their password through Greenlit, which sends the link through the email provider.

![C4 system context for reset a forgotten password](diagrams/c4-context.png)

### Containers

Both pages call the Greenlit API; the API stores the token hash in the Greenlit database and sends the email.

![C4 container view for reset a forgotten password](diagrams/c4-container.png)

### Components

One handler issues and emails the token; a second handler checks and consumes it.

![C4 component view for reset a forgotten password](diagrams/c4-component.png)

### Class structure

Each `User` may hold several `PasswordResetToken` rows; `IsUsable` combines the one-hour expiry and the single-use rule.

![Class diagram for reset a forgotten password](diagrams/class-structure.png)

### Behaviour — request a reset link

The response is the same whether or not the address has an account (`L2-002` AC2). Only a delivery failure changes it (`L2-002` AC3).

![Sequence diagram: request a reset link](diagrams/sequence-request-link.png)

### Behaviour — choose a new password

The token is usable once within one hour (`L2-003` AC4); the password rules match `L2-003` AC2 and AC3.

![Sequence diagram: choose a new password](diagrams/sequence-choose-password.png)
