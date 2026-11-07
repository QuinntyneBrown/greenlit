# ADR-009: Working days are weekday sets, and days that turn red are kept, not deleted

**Status:** Accepted
**Date:** 2026-11-07

## Context

Journey 15 (Set working days, `L2-039`, `L2-040`) lets the manager set the team's work week and a
part-timer's own working days. The design left open what happens to `TimeOffDay` rows on a weekday
that stops being a working day. ADR-008 deletes days booked on a date that becomes a holiday, but a
work-week change is a standing rule that the manager can flip back.

## Decision

- **Weekday sets.** `WorkingDays` is a `[Flags]` enum (Mon = 1 ... Sun = 64). `Team.WorkingDays`
  defaults to Mon-Fri; `TeamMember.WorkingDays` is null unless the member differs from the team, and
  saving the team's own days clears it. The API spells days as `"Mon"` to `"Sun"`.
- **Stored days are kept.** Changing a work week never deletes or edits `TimeOffDay` rows. A stored
  day on a non-working weekday reads "Not working" (red), counts in no allowance figure and is not
  "in" or "out" on the Out row. Switching the weekday back on shows the day again exactly as it was.
- **The member override follows, not copies.** A member without an override follows the team's work
  week, including later changes to it; an override is a full replacement set.
- **No new days on a non-working weekday.** Set-days drops such dates exactly as it drops weekends;
  a stroke of only non-working days answers `all_non_working` (400).

## Consequences

- Nothing is lost by a mistaken change and no hidden writes happen across members.
- Requests whose pending days turn red keep their stored days; they stop counting in the figures.
- A migration adds `Teams.WorkingDays` (default Mon-Fri) and `TeamMembers.WorkingDays` (nullable).
- Holidays on a non-working weekday are not rejected (only weekends are, `day_is_weekend`); deferred.
