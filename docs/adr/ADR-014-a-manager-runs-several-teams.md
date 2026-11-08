# ADR-014: A manager runs several teams; the session names the active one and the account remembers the default

**Status:** Accepted
**Date:** 2026-11-08

## Context

Until now a person could be on exactly one team: `CreateTeamCommandHandler` refused a second team
with `409 team_exists` (`L2-008` AC8), and every team-scoped handler found "the" team by looking for
any team the caller managed or had a row on. `L2-054` lets a manager run several teams, open a
default team on sign-in, and switch between their teams from Settings and from the header. A
member stays on one team, and a team keeps exactly one manager (`Team.ManagerUserId`).

ADR-004 already puts `team_id` and `team_member_id` in the session token, but the handlers never
read them: with one team per person there was nothing to choose. With several teams the "first team
I am on" lookup becomes ambiguous, so the active team has to come from somewhere explicit.

## Decision

- **The session names exactly one team, the active team.** ADR-004 stands: the token carries
  `team_id` and `team_member_id`. `ICurrentUser` now also exposes `TeamId` from the `team_id` claim,
  and one helper (`ActiveTeam`) resolves the caller's team for every team-scoped handler: the team
  the claim names, and only while the caller is still its manager or has a live row on it. A token
  without the claim (one issued before the person was on a team, or by the tests) falls back to the
  sign-in choice below, so it never widens access.
- **Switching re-issues the session.** `POST /api/teams/{id}/switch` checks that the caller manages
  that team and returns a new `SessionDto` for it (the same shape `CreateTeam` already returns),
  with `team_member_id` set to the caller's own row on that team. The client replaces its stored
  token. The old token stays valid until it expires and keeps naming the old team, so a switch on
  one device never signs out another (`L2-054` AC10).
- **The default team lives on the account.** `User.DefaultTeamId` is a nullable column with no
  foreign key. The first team a person creates sets it; later teams leave it alone;
  `PUT /api/teams/default` changes it. A null or stale value (a team the person no longer manages)
  is never trusted: sign-in reads it through `TeamChoice.ForSignInAsync`, which picks the default
  team when the person manages it, else the earliest created team they manage, else their live
  member row's team, else no team. The migration `AddDefaultTeam` back-fills each existing
  manager's earliest team as their default; SQLite (tests and the e2e API) gets the column from the
  model, and the fallback makes the back-fill a convenience rather than a requirement.
- **Who may create another team.** A person on no team, as before, or a person who manages at
  least one team and has no live row on a team they do not manage. A person who is on a team only
  as a member still gets `409 team_exists`, "You're already on a team." The new team becomes the
  active team (its session is returned) and does not become the default unless it is the first.
- **A team the caller does not manage is a 404.** Switching to it or making it the default answers
  `404` with the code `team_not_found`, the same for another manager's team, a team the caller is
  only a member of, and an id no team has, so the answer reveals nothing about other teams.
  `GET /api/teams/mine` lists only the teams the caller manages and is empty for everyone else.

## Alternatives rejected

- **A team id header on every request** (`X-Greenlit-Team`). Every handler would have to validate a
  client-chosen id on every call, and one forgotten check leaks another team. Re-issuing the signed
  token keeps the check in one place, at switch time, and the claim cannot be forged.
- **One token holding several teams** (a `team_ids` claim plus a client-chosen active one). It still
  needs a per-request choice from the client, the token grows with every team, and a token issued
  before a team was added would not know it.
- **A default flag on the manager's `TeamMember` row.** "Exactly one default" would have to be kept
  across rows of different teams; one nullable column on `User` is one default by construction.

## Consequences

- Every team-scoped handler goes through one resolution helper, so a new handler that copies an
  existing one is scoped to the active team for free.
- The client must treat a switch like a sign-in: replace the token, then reload every screen's data
  so the old team's data is never shown under the new team's name.
- A token keeps naming its team for up to eight hours. If a manager loses a team (out of scope
  today: teams are not deleted or transferred), the helper's "still its manager or member" check
  turns that token's team-scoped calls into 404s rather than leaking data.
