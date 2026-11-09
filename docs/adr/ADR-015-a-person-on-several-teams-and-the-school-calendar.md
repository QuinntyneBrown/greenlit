# ADR-015: A person belongs to several teams in any role; a school calendar is a team setting with its own closures

**Status:** Accepted (extends ADR-014; supersedes ADR-014's "a member stays on one team" and its
`409 team_exists` rule); partly superseded by ADR-016 (a person's own days are synced across
their teams)
**Date:** 2026-11-08

## Context

ADR-014 let a **manager** run several teams: the session names the active team (`team_id`,
`team_member_id`, ADR-004), `POST /api/teams/{id}/switch` re-issues the session, and
`User.DefaultTeamId` is the team sign-in opens. It kept two limits: a member is on exactly one
team, and a person who is only a member gets `409 team_exists` when they try to create a team.

`L2-055` to `L2-062` (L1-015, L1-016) remove those limits so a team can be a household: a person
may be a member of several teams, manage some and be a member of others, accept an invitation with
the account they already have, and a manager may turn on a school calendar that marks children
and records the days school is closed. The team stays the unit of scope: Team, Member, Day and
Holiday never cross teams (superseded by ADR-016 for the Day on a person's own rows, which is
synced to their other teams), and a team keeps exactly one manager (`Team.ManagerUserId`).

Three things in the current code assume one team per member:

1. `TeamChoice.TeamIdAsync` opens "the team they have a row on" for a person who manages nothing,
   which is ambiguous with two rows.
2. The session's `role` claim is the account's `User.Role`, a single value for every team. A
   person who manages Design team and is a member of Product team would carry `Manager` into
   Product team, and the client would show them the manager's screens there (the `Manager`
   policy and the handlers still refuse, because they check `Team.ManagerUserId`).
3. Accepting an invitation always creates an account and answers `409 account_exists` when the
   email has one.

## Decision

### Memberships and the session

- **A membership is a live `TeamMember` row with the person's `UserId`.** Nothing new is stored
  for it. "Belongs to a team" means "has a live row on it" (`RemovedUtc` null), whether the
  person manages it or not.
- **The session's `role` claim is the role on the active team.** `Sessions.Issue` (Application)
  passes the role to `ITokenService.Issue`: `Manager` when the caller is the active team's
  `ManagerUserId`, otherwise `Member`; a session that names no team carries `User.Role` as
  before (a new Google account is a manager about to create a team). `User.Role` stays as the
  account's highest role and is no longer what the client reads per screen. The `Manager`
  authorization policy therefore means "manages the active team", and the handlers still check
  `Team.ManagerUserId` as the authority.
- **`ActiveTeam` is unchanged**: the team the `team_id` claim names, accepted by each handler only
  while the caller manages it or has a live row on it.
- **`TeamChoice` (the team sign-in opens)**: while the person manages at least one team, ADR-014
  stands (the stored default when they manage it, else the earliest created team they manage).
  A person who manages none opens the team they **joined first**: `User.DefaultTeamId`, which is
  now also set when a person's first membership is created by accepting an invitation, while they
  still have a live row on it; else the earliest created team they have a live row on. A member
  cannot set the default (`PUT /api/teams/default` stays manager-only, `404 team_not_found`).
- **The list of teams widens.** `GET /api/teams/mine` returns every team the caller has a live row
  on, oldest first (by `Team.CreatedUtc`), each with `active`, `isDefault` and a new `manages`
  flag. "Your teams" in Settings shows only the rows with `manages`; the header switcher shows
  them all when there are two or more, and shows "Add another team" and "Manage your teams" only
  when one of them has `manages`. A person on no team gets an empty list.
- **Switching widens.** `POST /api/teams/{id}/switch` accepts any team the caller has a live row
  on and answers `404 team_not_found` otherwise (someone else's team, a team they were removed
  from, an unknown id). The rest of ADR-014's switch stands: a new session, the old one untouched.
- **Anyone may create a team.** `CreateTeamCommandHandler` drops `409 team_exists`. The creator
  becomes the new team's manager; the new team becomes their default when it is the first team
  they manage (their stored default otherwise points at a team they manage, or at a member team
  that `TeamChoice` no longer prefers once they manage one).
- **Removal is per team.** Removing a person from one team soft-removes that row only (L2-011).
  `RemovedMembers.IsRemovedAsync` already refuses sign-in only when *every* row is removed, so a
  person on another team keeps signing in; a session that still names the removed team opens
  nothing of it (`ActiveTeam`'s live-row check), and the client sends them to sign in again,
  which opens a team they still belong to.

### Inviting an email that already has an account

- **Match by email, attach to the account.** An invitation is still sent to a row by email
  (L2-010). `GET /api/invitations/{token}` now also returns `accountExists`. Accepting attaches
  the account to the invited row (`TeamMember.UserId`), sets the row's name to the account's
  display name, uses the invitation up with the same single conditional update as before, and
  returns a session that names the inviting team. One shared step, `InvitationMembership`, does
  this for all three ways in:
  - `POST /api/invitations/{token}/sign-in` (anonymous, `{ password }`): checks the password of
    the account whose email is the invitation's, exactly as sign-in does (`401
    invalid_credentials` on a mismatch, nothing attached).
  - `POST /api/invitations/{token}/join` (authenticated): attaches the signed-in caller when their
    email is the invitation's; otherwise `403 invitation_other_account` and nothing changes.
    The client compares the addresses first to show "This invitation is for someone else"; the
    API enforces it.
  - `POST /api/invitations/{token}/accept-google` (L2-052): when the verified Google email has an
    account, attaches it (and links the Google subject as sign-in does) instead of `409
    account_exists`.
- `POST /api/invitations/{token}/accept` (name and password) keeps creating an account and still
  answers `409 account_exists` when one appeared meanwhile; the client never offers that form for
  an address with an account.
- A person who already has a live row on the inviting team cannot be invited again (`409
  member_exists`, unchanged), and attaching refuses the same case with `409 member_exists`.

### The school calendar

- **A team setting.** `Team.SchoolCalendar` (bool, default false), read and saved through the
  existing settings endpoints in a new section (`PUT /api/team/settings/school-calendar`), manager only.
  Turning it off deletes nothing; every reader applies "child" and "closure" only while it is on.
- **A member attribute.** `TeamMember.IsChild` (bool, default false), saved with the Team section
  (`PUT /api/team/settings/team`) and set by "Add a child" (`POST /api/team/children`, name and an
  optional email). The manager's own row cannot be a child, and nothing is marked a child while
  the school calendar is off (`400 child_not_allowed`). A member is a child for every reader
  only while `IsChild && Team.SchoolCalendar`.
- **Children have no allowance.** The allowance calculator returns no figures for a child: the
  month, year, person and request DTOs carry `null` for their allowance fields, and the client
  shows "No allowance".
- **A login-less child's days are confirmed.** When the manager sets days on a child's row that
  has no email, `DayChanger` stores them as `Confirmed` whatever status was painted. A child with
  an email is an ordinary member for days and requests.
- **Closures are their own table.** `SchoolClosure { Id, TeamId, TeamMemberId?, Label, FirstDay,
  LastDay, Imported }`: `TeamMemberId` null means "all children" (every child, including children
  marked later); `Imported` marks the rows an `.ics` import added. It is neither a `Holiday`
  (team-wide, red, removes booked days, ADR-008) nor a `Day` (it has no `DayStatus`, ADR-003), so
  no existing count, coverage rule or day rule can pick it up by accident. Closures are deleted
  outright (no undo was asked for); deleting a member's row is soft, so a child's closures stay
  with their history. The month DTO carries the closures that touch the month, and the client
  marks the covered cells of children only.
- **Endpoints**: `GET /api/team/closures`, `POST /api/team/closures`, `PUT /api/team/closures/{id}`,
  `DELETE /api/team/closures/{id}` and `POST /api/team/children/{memberId}/calendar` (multipart,
  one file), all manager only except the read, which any member of the team may call. An edited
  imported closure becomes typed (`Imported = false`), so a later import does not undo the
  manager's edit.
- **Import replaces its own rows only.** In one unit of work: delete the child's closures with
  `Imported = true`, then add one closure per event. Typed closures, other children and "all
  children" closures are untouched.

### Reading `.ics` files

- **A small parser in Application, no new package.** `IcsCalendar.Parse` unfolds lines (RFC 5545
  §3.1), reads each `VEVENT`'s `SUMMARY`, `DTSTART` and `DTEND`, and unescapes text. It needs no
  time-zone database, recurrence engine or network, which a maintained library (Ical.Net) would
  bring along with a dependency the rest of the solution does not need.
- **Limits, chosen conservatively** (any breach is `400 calendar_unreadable` and changes nothing):
  - the file is at most **1 MB** (1 048 576 bytes); the request body limit is set on that
    endpoint;
  - it must begin with `BEGIN:VCALENDAR`;
  - at most **500** `VEVENT`s;
  - only **all-day** events (`DTSTART;VALUE=DATE:yyyymmdd`) become closures; `DTEND` is exclusive
    as RFC 5545 says, a missing `DTEND` means one day; timed events and events with `RRULE` are
    left out rather than guessed;
  - a closure is at most **366** days, and a label is trimmed to **120** characters (an empty
    `SUMMARY` becomes "School closed");
  - a file that yields no all-day event is refused as unreadable, so a wrong export never wipes
    the earlier import.

## Alternatives rejected

- **A `Kind` on the team (workplace or household).** Decided against in the requirements: the
  school calendar toggle is the only difference, and a kind would fork every screen.
- **A separate endpoint for memberships** (`GET /api/teams/memberships`) beside a managers-only
  `GET /api/teams/mine`. The switcher and "Your teams" would read two lists that overlap; one list
  with a `manages` flag serves both and keeps one cache on the client.
- **Keeping one account-wide `role` claim.** The client would need a per-team role from yet
  another call on every screen, and the `Manager` policy would keep admitting a manager into teams
  where they are a member. The role on the active team is what every screen needs.
- **A remembered "last chosen team" for sign-in** (the first draft of L2-056 AC4). It conflicts
  with ADR-014's default team, which sign-in opens for managers; a second rule for members would
  be one more stored value. Members open the team they joined first, through the same column.
- **Creating a second account for an invited email that has one.** Two identities for one
  address break sign-in by email and Google matching (ADR-012).
- **Storing closures as `Holiday` rows with a member, or as `TimeOffDay` rows with a new status.**
  Holidays are red, team-wide and clear booked days; days count against allowances and coverage.
  Either would need an exception in every reader; a separate table needs none.
- **One closure row per child for "all children".** Edit and delete would have to keep copies in
  step, and a child marked later would miss the closures. A null member is one row.
- **Ical.Net.** See above; revisit if repeating events or time zones are ever needed.

## Consequences

- A client screen reads "am I the manager here?" from the session's role claim or the screen's
  own DTO, never from the account. The header switcher reads the widened list for everyone.
- A person removed from their active team keeps their account; the next call on that team is a
  404 and the client signs them in again onto a team they still belong to.
- Every allowance figure is nullable on the wire; clients must render "No allowance" rather than
  0 for a child.
- Closure reads are an extra query on the month endpoint, only when the school calendar is on.
- The migration `AddSchoolCalendar` adds `Teams.SchoolCalendar`, `TeamMembers.IsChild` and the
  `SchoolClosures` table; SQLite (tests, e2e API) gets them from the model.
