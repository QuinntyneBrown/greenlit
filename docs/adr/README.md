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
