# ADR-011: Password reset tokens are single-use, hashed and expire in an hour

**Status:** Accepted
**Date:** 2026-11-07

## Context

Resetting a forgotten password (journey 19, `L2-002`, `L2-003`) emails a link that lets whoever holds it choose a new password. The link is a credential, and the request endpoint is anonymous, so it must not tell a stranger which addresses have accounts.

## Decision

- Same mechanism as invitations (ADR-006): a 32 byte random token, base64url encoded, only its SHA-256 hash stored in `PasswordResetToken`, sent through `IEmailSender` (logged in development and the e2e API).
- The token expires one hour after it is issued and can be used once (`UsedUtc`). It is claimed with one conditional update, so two simultaneous submits cannot both succeed. A new request retires the person's earlier unused tokens.
- Requesting a reset answers 204 whether or not the address has an account, and an unknown address does no work that differs visibly. An expired, used or unknown token is the same `reset_link_expired` (410).
- Sessions are stateless (ADR-004), so existing sessions are not ended by a reset.

## Consequences

Developers read reset links from the API log. A delivery outage is visible only for addresses with an account (`L2-002` AC3 requires showing it); that small leak is accepted.
