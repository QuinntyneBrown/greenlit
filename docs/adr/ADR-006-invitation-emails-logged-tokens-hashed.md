# ADR-006: Invitation emails are logged, and invitation tokens are stored hashed

**Status:** Accepted
**Date:** 2026-11-07

## Context

Inviting a member (journey 5, `L2-010`) emails a link that lets the person set a password within
seven days. The design left the email provider open. Tests and the e2e API must run without a
network or a mail server (ADR-001), a small product should not need an SMTP account to be
developed, and the link is a credential: anyone who reads it can join the team.

## Decision

- `IEmailSender` (Greenlit.Application) sends one `EmailMessage`. `LoggingEmailSender` in
  Greenlit.Infrastructure is the only implementation for now: it writes the recipient, subject and
  text to the application log. A real provider replaces it behind the same interface when the
  product needs one. The API tests replace it with an in-memory recorder they can read, and can make
  it fail to prove the rollback of `L2-010` AC4.
- The invitation token is 32 random bytes, base64url encoded. Only its SHA-256 hash is stored
  (`Invitation.TokenHash`), so a database read never yields a working link. An invitation expires
  seven days after it was sent and is single use (`AcceptedUtc`). Re-inviting issues a new token and
  retires the earlier ones.
- The link is `{Greenlit:App:Origin}/accept-invite/{token}`; `IInvitationLinks` builds it.
- SQL Server gets the schema change through an EF migration applied with `greenlit migrate`;
  SQLite builds it from the model.

## Consequences

Developers read invitation links from the API log. Nothing is sent to real people until a provider
is wired in. A lost email cannot be recovered from the database; the manager re-invites.
