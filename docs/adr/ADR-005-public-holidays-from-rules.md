# ADR-005: Public holidays are worked out offline from each country's rules

**Status:** Accepted
**Date:** 2026-11-07 (Canada and Italy added 2026-11-08)

## Context

Creating a team (journey 3, `L2-008` AC5) copies the chosen country's public holidays into the
team's holidays. The create-team design left the source open. The mocks offer three calendars:
United Kingdom, Ireland and United States. Greenlit is a small product for small teams, and the
tests must run without network access or a database server (ADR-001). A third-party holiday API
would add a key, an outbound host, a failure mode at the moment a team is created and a provider
to test against. A static list per year rots: someone has to add next year's dates.

## Decision

`IPublicHolidayProvider` (Greenlit.Application) is implemented by
`RuleBasedPublicHolidayProvider` in Greenlit.Infrastructure. It computes a year's holidays from
each country's rules, with no data file and no network:

- **GB** — the bank holidays of England and Wales: New Year's Day, Good Friday, Easter Monday,
  the early May, spring and summer bank holidays, Christmas Day and Boxing Day, with the
  substitute days that move a weekend holiday to the next weekday (named "… (substitute)").
- **IE** — New Year's Day, St Brigid's Day, St Patrick's Day, Easter Monday, the May, June,
  August and October bank holidays, Christmas Day and St Stephen's Day, with substitutes.
- **US** — the eleven federal holidays, with the observed day (Friday for a Saturday, Monday for a
  Sunday).
- **CA** — the statutory holidays of Ontario, Canada's most populous province: New Year's Day,
  Family Day, Good Friday, Victoria Day, Canada Day, Labour Day, Thanksgiving, Christmas Day and
  Boxing Day, with substitutes as for GB. Other provinces differ by a day or two; the manager adds
  or removes those (journey 14).
- **IT** — Italy's national holidays: New Year's Day, Epiphany, Easter Monday, Liberation Day,
  Labour Day, Republic Day, Ferragosto, St Francis of Assisi's Day (from 2026), All Saints' Day,
  the Immaculate Conception, Christmas Day and St Stephen's Day. Italy has no substitute days, so a
  holiday that falls on a weekend is not stored; the weekend is red by rule.

Easter comes from the anonymous Gregorian algorithm. Creating a team stores the current and the
next year in the team's time zone. One-off holidays a government declares (a coronation, a
jubilee) are not in the rules; the manager adds them (journey 14).

## Consequences

- Creating a team never waits on, or fails because of, another service, and the tests need no
  stub for it.
- Adding a country means writing its rules and a test. Rule changes by a government need a code
  change; for five countries with stable rules that is rare.
- Years after the next one are not stored at creation. Journey 14 (Manage team holidays) decides
  whether to top them up each year.
