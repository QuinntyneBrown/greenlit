# Edit team settings

## Overview

Settings holds everything the manager decides about the team, split into five sections: Team, Allowances, Work week & holidays, Coverage and Notifications. Each section saves on its own, so a change in one section never saves or discards another.

A manager also sees a last section, "Your teams", designed in `teams/switch-team` (`L2-054`): it lists the teams they manage and switches the active team. Every other section always shows the active team.

This feature covers the page and the Team section: the team name, the time zone, and each member's role and yearly days. The other sections have their own designs (`allowances/allowance-defaults`, `teams/manage-holidays`, `teams/working-days`, `teams/coverage-minimum`, `teams/notification-settings`).

Members can open Settings but see every section read-only, with a note naming the manager to ask.

**section save** — save of one settings section's fields as one request, with its own busy, saved and failed states

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`SettingsPage`** — App-shell page (`page: 'settings'`) with the section nav Team, Allowances, Work week & holidays, Coverage and Notifications. Each section is a child component with its own "Save changes" button and its own busy, saved and failed states.
- **`TeamSettingsService / TEAM_SETTINGS_SERVICE`** — Contract and token in the `api` project: `get()` and one `save…` method per section.
- **`TeamSection`** — Renders Team name, Time zone and the member rows with the role control "Role for {name}" and the field "Yearly days for {name}". It compares the form with the loaded values and shows the toast "No changes to save" when nothing differs (`L2-009` AC4).

**Backend**

- **`TeamSectionController`** — `GET /api/team/settings/team` returns the Team section (name, time zone, `CanEdit`, the manager's name and one row per member) to every member of the caller's team; `PUT /api/team/settings/team` saves it and carries the `Manager` policy. The other sections keep the manager-only `GET /api/team/settings` of their own designs (`TeamSettingsController`); that read stays manager-only, so a member sees the Team section read-only and the other sections are not shown to them.
- **`GetTeamSectionQueryHandler`** — Returns the caller's own team's section with `CanEdit` true for the team's manager. A row shows `Manager` when it is the team's owning manager or its stored role says so.
- **`SaveTeamSectionCommandHandler`** — Updates `Team.Name`, `Team.TimeZone`, and each listed member's `Role` and `YearlyDays` (null: the team default applies). A member id outside the caller's team is a 404 and nothing is saved; the validator refuses an empty name, a time zone outside the L2-008 options, negative yearly days and an unknown role (400 with `errors`); the handler refuses to make the team's owning manager a Member.
- **`ICurrentUser`** — Greenlit.Application abstraction (exists). The handlers resolve the caller's active team through `ActiveTeam` (the session's `team_id`, ADR-014), so every query is scoped to that one team.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.

**Role on the membership.** `TeamMember.Role` (Member / Manager) already exists and is applied to the account when an invited person joins. Decision: a team has one owning manager (`Team.ManagerUserId`), who creates the team and cannot be made a Member; the Role control records the role of every other row. Changing the role of a person who has already joined does not change their account's role claim or give them ownership: managing the team stays with the owner (resolved by the simplest option that fits the existing `Manager` policy; revisit if teams need several managers).

**Allowances section (journey 11 deferred it here).** Days per year, Leave year starts and Max carry-over save through the existing `PUT /api/team/settings/allowances`. A negative Days per year shows the form summary "Fix 1 thing to continue" with "Days per year must be 0 or more" and the inline "Enter 0 or more days.". When members have no yearly days of their own the page shows the banner "{Two} members have no allowance set" with "They’re using the default of {25} days until you change it." (L2-027 AC4).

**Members' view.** A member sees the Team section read-only (fields disabled, no Save, no Invite) with the note "Only managers can change team settings." and "Ask {manager} if something needs updating.". The other sections read manager-only endpoints, so they are not shown to a member yet; showing them read-only needs a member-readable read of each (deferred, with Notifications).

For a read-only member, `GET /api/team/settings/team` resolves a null row `YearlyDays` to the team's `DefaultYearlyDays`, so every "days / yr" box shows the person's effective yearly days. The manager's editable response keeps null to preserve the distinction between a personal value and the team default when saving.

**Page behaviour.** Settings shows the section nav from 1024px wide. After a section saves, the page shows the banner "Team settings saved" with "Everyone sees the new settings straight away." (L2-009 AC7) beside the section's own "Saved" status. The Team section's "Save changes" stays enabled so pressing it with no edits can say "No changes to save" (`L2-009` AC4); the other sections enable theirs when an edit makes them differ from what is saved. Each section's draft is independent; saving one leaves the others' unsaved edits alone.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-009` | `L1-002` | **Team settings.** Settings has the sections Team, Allowances, Work week & holidays, Coverage and Notifications, each saved on its own. Only managers can change them. |
| `L2-059` | `L1-016` | **School calendar setting.** A manager-only team setting, off by default; off hides children and closures and keeps them. |
| `L2-060` | `L1-016` | **Child members.** A manager-set member attribute: no allowance, no days left; a login-less child's days are saved as Confirmed. |

## Diagrams

### System context

Managers change and members read the team's settings in Greenlit.

![C4 system context for edit team settings](diagrams/c4-context.png)

### Containers

The Settings page loads all sections in one call and saves each section with its own call.

![C4 container view for edit team settings](diagrams/c4-container.png)

### Components

Reads go to one query handler; the Team section saves through its own command handler behind the `Manager` policy.

![C4 component view for edit team settings](diagrams/c4-component.png)

### Class structure

`TeamSettingsDto` carries every section and `CanEdit`; the Team section's command updates the `Team` and its `TeamMember` rows.

![Class diagram for edit team settings](diagrams/class-structure.png)

### Behaviour — save the Team section

A section with no edits never calls the API (`L2-009` AC4). A failure keeps the values as entered (`L2-009` AC5). A member never sees the save button (`L2-009` AC3).

![Sequence diagram: save the Team section](diagrams/sequence-save-team-section.png)

## Open questions answered (ADR-015, 8 Nov 2026)

- **A sixth section.** "School calendar" (`section#school`, nav "School calendar") follows Notifications and precedes Your teams. It is saved with its own "Save changes" through `PUT /api/team/settings/school-calendar` (`{ schoolCalendar }`) and read with the team settings (`GET /api/team/settings` gains `schoolCalendar`). See `teams/school-calendar` for the closures it lists.
- **Team section while the school calendar is on.** Each row but the manager's gains the checkbox "Child" (`aria-label` "{name} is a child"); a child row shows "No allowance" instead of the yearly-days field; `PUT /api/team/settings/team` carries `isChild` per row and refuses a child mark on the manager's row or while the setting is off (`400 child_not_allowed`). "Add a child" sits beside "Invite a member".
- **Who sees the section editable?** The manager of the active team, read from the settings DTO's `isManager`, which is per team: a manager of another team who is a member here sees it read-only (`L2-055` AC4).
