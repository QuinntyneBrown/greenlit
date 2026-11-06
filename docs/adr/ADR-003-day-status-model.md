# ADR-003: A day is one row with one status; weekends are a rule, holidays belong to the team

**Status:** Accepted
**Date:** 2026-11-06

## Context

The sheet Greenlit replaces colours every cell: red (weekend or holiday), blue (tentative),
yellow (requested), green (confirmed), or blank (working day). The product must round-trip that
sheet exactly while keeping the model small enough for a team of under ten.

## Decision

- `TimeOffDay` is one row per member per calendar date with a `DayStatus` of `Tentative`,
  `Requested` or `Confirmed`; a unique index on `(TeamMemberId, Date)` enforces one cell per day.
  A date with no row is a working day.
- Weekends are never stored. The UI and the API derive them from the date in the team's time zone.
- `Holiday` is a team-level row (`TeamId`, `Date`, `Name`): red for everyone. A member cannot hold
  a `TimeOffDay` on a holiday; the API rejects it with code `day_is_holiday`.
- Status transitions are the product's workflow: a member moves a day between blank, `Tentative`
  and `Requested`; only the manager moves it to `Confirmed` or back. Those rules live in
  Application handlers, not controllers.

## Consequences

- A month view is one query: the team's members, their days in the range, and the holidays.
- Changing a team's time zone can move which dates are weekends; the team owner decides that, and
  it is rare.
- Half days, hours and balances are out of scope by design. If they ever come, they are a new
  decision, not a column added quietly.
