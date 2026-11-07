# Architecture decision records

One file per decision, `ADR-NNN-short-title.md`, numbered in the order they were made. Read the
ADRs that cover an area before changing it; add one whenever a technology, pattern, data model
or infrastructure choice is made or revisited.

| ADR                                                       | Title                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [ADR-001](ADR-001-tests-run-without-a-database-server.md) | Tests run without a database server                                                |
| [ADR-002](ADR-002-api-tests-serialized.md)                | API tests run sequentially                                                         |
| [ADR-003](ADR-003-day-status-model.md)                    | A day is one row with one status; weekends are a rule, holidays belong to the team |
| [ADR-004](ADR-004-eight-hour-bearer-session.md)           | A session is one eight-hour bearer token kept in the browser                       |
| [ADR-005](ADR-005-public-holidays-from-rules.md)          | Public holidays are worked out offline from each country's rules                   |
| [ADR-006](ADR-006-invitation-emails-logged-tokens-hashed.md) | Invitation emails are logged, and invitation tokens are stored hashed           |
| [ADR-007](ADR-007-allowances.md)                  | Allowances are computed from day rows, never stored as a balance                   |
| [ADR-008](ADR-008-team-holidays.md) | A removed holiday is kept, a team remembers its calendar, and adding a day off clears booked days |
| [ADR-009](ADR-009-working-days.md) | Working days are weekday sets, and days that turn red are kept, not deleted |
| [ADR-010](ADR-010-static-web-apps-hosting.md) | Host both Angular applications on Azure Static Web Apps, deployed from main |
| [ADR-011](ADR-011-api-hosting.md) | Host the API on a Free Linux App Service with a Basic Azure SQL database |
| [ADR-012](ADR-012-google-sign-in.md) | Google sign-in exchanges a Google access token for the Greenlit session |

## Template

```markdown
# ADR-NNN: Title

**Status:** Accepted | Superseded by ADR-MMM
**Date:** YYYY-MM-DD

## Context

What is the situation and what forces are at play.

## Decision

What was decided, in one or two paragraphs.

## Consequences

What becomes easier, what becomes harder, what to watch for.
```
