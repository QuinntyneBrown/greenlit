# ADR-008: A removed holiday is kept, a team remembers its calendar, and adding a day off clears booked days

**Status:** Accepted
**Date:** 2026-11-07

## Context

Journey 14 (Manage team holidays, `L2-036` to `L2-038`) lets the manager add and remove holidays,
with Undo on removal. The design left three things open: how Undo restores a holiday, where the
Settings page gets "Public holidays: United Kingdom" and "2027 UK bank holidays are ready" from,
and what happens to days members already booked on a date that becomes a holiday (ADR-003 forbids
a day on a holiday).

## Decision

- **Soft delete.** `Holiday.RemovedUtc` is set on removal and cleared on Undo, so the name and date
  come back unchanged. Every reader sees only holidays with no `RemovedUtc` (a global query filter);
  the holiday handlers and the seed ignore the filter. The `(TeamId, Date)` index stays unique, so
  adding a date whose holiday was removed revives that row with the new name.
- **The team keeps its country.** `Team.HolidayCountry` (`GB`, `IE`, `US`, or null for "none") is set when the team
  is created. It names the source in Settings and tells the review banner which calendar to look at.
- **The review banner** shows when the country's public holidays for next year (in the team's
  time zone) are available from `IPublicHolidayProvider` and the team holds none of them. "Review
  holidays" jumps to the Work week & holidays section; importing a calendar after creation is deferred.
- **Adding a day off clears booked days.** Days members already hold on that date, in any status,
  are deleted in the same unit of work, because a holiday never holds time off. Undo of a removal
  does the same for days booked while the date was a working day.
- **Settings lists the current year.** The list shows the holidays of the current year in the
  team's time zone, so a date appears once.

## Consequences

- Undo needs no copy of the holiday; a row removed and added again is one row.
- Deleting a confirmed day when a holiday lands on it is silent; the manager chose the date and the
  dialog says it turns red for everyone.
- A migration adds `Holidays.RemovedUtc` and `Teams.HolidayCountry`.
