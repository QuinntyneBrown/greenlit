# ADR-016: A person's own days are synced across their teams as read-only Tentative copies

**Status:** Accepted (extends ADR-015; supersedes ADR-015's "Team, Member, Day and Holiday never
cross teams" for the Day on a person's own rows)
**Date:** 2026-11-09

## Context

ADR-015 lets one person belong to several teams: one account, one email, one live `TeamMember`
row per team, all with the same `TeamMember.UserId`. Each team stayed its own sheet, so L2-055
AC3 said a day marked in one team never appears in another. That leaves the work team blind to a
week booked on the family sheet and the family blind to the week booked at work, which is exactly
what a person on two sheets wants to avoid (L1-015, L2-064).

Every reader of days (the month, the year page, the person page, the Out row, coverage, the
allowance calculator, requests) works on one team's `TimeOffDay` rows, and the write paths that
add or remove a day are few: a stroke and its Undo (`DayChanger`), sending a request
(`SendRequestCommandHandler`), and a holiday clearing booked days (`HolidayCalendar.ClearDaysAsync`).
Approving, declining, cancelling and reopening a request only change a day's status.

## Decision

### Who is the same person

- **The account is the person.** Two rows are the same person when they carry the same
  `TeamMember.UserId` and both are live (`RemovedUtc` null). There is one account per email
  (ADR-012), and ADR-015 attaches an invitation to the account by its email, so matching on the
  account *is* matching on the email. Raw email matching on rows is rejected: a row that was
  invited but never signed in has an email typed by a manager and nobody behind it, and a manager
  could type someone else's address on a login-less row to read their days.
- **A row with no `UserId` is never synced**, in either direction: a login-less child or a name on
  the sheet has nothing to share. A child row with an account (ADR-015) is synced like any member.

### Storage: a mirror row per team, kept in step on write

- **`TimeOffDay` stays one row per member per date.** A day the person marks on one row (the
  *origin*) is copied as a *synced day* onto each of their other live rows, in the same unit of
  work. A synced day is an ordinary `TimeOffDay` with the new column `IsSynced = true`, so every
  reader keeps working within its own team.
- **One step keeps them in step: `DaySync.ReconcileAsync(person, dates)`** (Application). For each
  date it applies one invariant: *a live row of the person holds a synced day on a date exactly
  when it holds no day of its own there, the date is a working day for that row (team work week,
  the member's own working days, the team's holidays), and another live row of the person holds a
  day of its own on that date.* It reads the tracked rows, so it sees the caller's unsaved
  changes, and the caller saves once. It runs after a stroke and after Undo (`DayChanger`), after
  sending a request, after a holiday clears booked days, and when a person joins another team.
  Because it derives the synced days from the origins, no origin link is stored.
- **Rejected: reading the other teams at query time.** Every reader (month, year, person, Out
  row, coverage, allowance, requests, the phone week) would need a second, cross-team query and
  the same non-working and holiday rules applied to another team's days; one missed reader leaks
  or miscounts. Mirroring on the few write paths keeps reads team-scoped and unchanged.
- **Rejected: an origin foreign key on the synced day** (`OriginTimeOffDayId` or
  `OriginTeamMemberId`). Reconcile does not need it, and a second foreign key from `TimeOffDays`
  to `TeamMembers` is a second cascade path SQL Server refuses.

### Status of a synced day

- **A synced day is always `Tentative`**, whatever the origin's status (Tentative, Requested or
  Confirmed), and has no request (`TimeOffRequestId` null) and no `ConfirmedUtc`. The other team's
  manager is never asked to confirm a day they were not asked for, a synced day never creates or
  joins a `TimeOffRequest` there, and approving, declining, cancelling or reopening the origin's
  request (status changes only) leaves the synced days as they are. This keeps ADR-003's statuses
  intact: Requested and Confirmed stay the active team's workflow.
- **A synced day counts in no figure of the team it was copied into** (ADR-007): not Used, Booked,
  Requested, nor the Tentative count, so a week booked at work never spends the family team's
  allowance. As a Tentative day it counts the person *in* on the Out row and in coverage, like any
  Tentative day; the cell's marker is how the team sees the person is booked elsewhere.

### Who may change a synced day

- **A synced day is read-only where it was copied to.** Neither the person nor that team's
  manager can paint, clear or request over it; it changes only from the origin. A stroke that
  meets only synced days answers `403` with ProblemDetails code `synced_day_locked` and the
  message "That day was booked in another team. Change it in the team where it was booked." A stroke that mixes synced and
  other days changes the others and skips the synced ones (as Confirmed days are skipped for a
  member). Sending a request skips synced dates like holidays; a range of only synced days is the
  same `403 synced_day_locked`.
- **Clearing the origin clears its synced days**, unless another of the person's rows still holds
  a day of its own on that date. **Undo** (`RestoreDaysCommand`) goes through `DayChanger`, so the
  synced days follow the restored origin in the same unit of work.

### Non-working dates and holidays

- **A synced day is never stored on a date that is red in the other team** (weekend, holiday,
  non-working day of that team or of the member). Skipping never fails the origin's change.
- **A holiday added in a team** clears every day on that date there, synced days included
  (ADR-008); when it clears an origin, reconcile clears that origin's synced days elsewhere.
- **A holiday removed later does not bring a synced day back** by itself (no back-fill on holiday
  or working-day changes); the next change the person makes on that date reconciles it.

### Joining and leaving

- **Joining back-fills the future.** When a person attaches their account to a row on another
  team (`InvitationMembership`, ADR-015), reconcile runs over every date from today (in the
  joining team's time zone) on which any of their live rows holds a day of its own, so the new
  team sees their booked days at once and their other teams see days the manager had marked on
  the invited row. Past days are not copied.
- **Leaving (soft removal, L2-011)** removes nothing: the removed row's days, synced or not, stay
  as its history, and the row no longer gives or receives synced days. Synced days that it gave to
  the person's other rows stay until a change on that date reconciles them.

### Privacy

- The other team sees only the date and its colour on the person's own row, and the neutral label
  **"Booked in another team"**. Nothing names the origin team, its manager, a note, a request or a
  status other than the synced day's own. The month DTO's cell carries `synced: true`; no endpoint
  returns where it came from.

### Schema

- The migration **`AddSyncedDays`** adds `TimeOffDays.IsSynced` (bit, not null, default false).
  SQLite (tests and the e2e API) gets it from the model.

## Alternatives rejected

- **A shared, team-less `PersonDay` entity** read by every team: every reader and every per-team
  rule (holidays, working days, allowances) would have to merge two sources.
- **Copying the origin's status.** A Requested copy needs a request in the other team, and a
  Confirmed copy is a confirmation no manager gave; both break ADR-003's workflow.
- **Letting the other team paint over a synced day** (its own day wins). Two rows that both claim
  the date would make "clear the origin" ambiguous and invite double counting.
- **A per-team or per-person switch to turn syncing off.** Deferred; nobody asked for it yet.

## Consequences

- Every write path that adds or removes a day must call `DaySync.ReconcileAsync`; status-only
  changes need not. A new write path that forgets it leaves a team out of step until the next
  change on that date.
- Every count of Tentative days must exclude `IsSynced` (today only the allowance calculator
  counts them).
- A stroke can now be refused with `synced_day_locked`; clients show its message as the toast.
- Back-filling on join is bounded by the person's future days, a handful of rows.
- A person whose own day exists on the same date in two teams (possible only when a manager had
  marked a day on an invited row before they joined) keeps both; neither is synced over the other.
