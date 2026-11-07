# ADR-007: Allowances are computed from day rows, never stored as a balance

**Status:** Accepted
**Date:** 2026-11-07

## Context

ADR-003 kept the day model small and declared balances out of scope. The requirements that came
from the mocks (L2-014, L2-027, L2-029, L2-030) need each member's yearly days and days left on
the calendar, in the request dialog, on the person page and on the year page. (The allowance work
was first planned as "ADR-004"; that number was taken by the session ADR, so this is ADR-007.)

## Decision

- ADR-003's clause "Half days, hours and balances are out of scope" is superseded for balances:
  yearly days, adjustments and the days-left figures are in scope. Half days and hours stay out.
- A member's allowance is **computed on read** from `Team.DefaultYearlyDays` or
  `TeamMember.YearlyDays` (when set), the member's `AllowanceAdjustment` rows effective in the
  leave year, and their `TimeOffDay` rows. No running balance, counter or cached figure is stored,
  so the figures can never drift from the sheet.
- One Application service, `AllowanceCalculator`, produces every figure; every query handler that
  shows one calls it. Only working days count: weekends, team holidays never count.
- The leave year is the twelve months from the first day of `Team.LeaveYearStartMonth` that contain
  "today" in the team's time zone. "Today" comes from the existing `TimeProvider`, not a new clock
  abstraction, so tests freeze it as they already do.
- **Max carry-over** is a stored team setting only. Greenlit does not run a year-end step; carry-over
  is entered by the manager as an adjustment with a reason (journey 23, "Carried over from 2025").
- An over-allowance state (requested days beyond days left) is a warning, never a block.

## Consequences

- Every screen agrees by construction, and a change to a day shows in the figures at once.
- Each sheet query now also reads the year's days and adjustments for the team: one extra query
  per table, still small for under ten people.
- Carrying days over is a manual, explained act rather than a silent rule; an automatic year-end
  step would be a new decision.
