# Estimates: teams

| Design | Effort | Complete |
|---|---|---|
| coverage-minimum | 2 days | 100% |
| create-team | 3 days | 100% |
| invite-member | 3 days | 100% |
| manage-holidays | 3 days | 100% |
| notification-settings | 2 days | 100% |
| remove-member | 2 days | 100% |
| school-calendar | 8 days | 100% |
| switch-team | 7 days | 100% |
| team-settings | 3 days | 90% |
| working-days | 3 days | 100% |

- notification-settings is built (journey 25): the Notifications section of Settings (manager only, two `gl-switch` controls and their own Save changes), `PUT /api/team/settings/notifications`, the new-request email to the manager and the Decisions switch on approve and decline; per-member preferences are deferred. Showing the other sections read-only to a member remains deferred. remove-member is built (journey 24): soft removal from the person page; restoring a removed member is deferred. coverage-minimum is built (journey 17): the Settings stepper and its save, and the Out row and request dialog flags. invite-member is built (journey 5). working-days is built (journey 15): the team work week in Settings, a part-timer's days in a dialog opened from the Team list and from the manager's view of the person page (journey 22). manage-holidays is built (journey 14): the holiday list, add, remove with Undo, and the next-year review banner; importing a calendar after creation is deferred. switch-team is built (L2-054, ADR-014): the default team on sign-in, a manager's second team, Your teams in Settings (switch, make default, add another team) and the header team switcher; deleting or transferring a team is deferred. A person on several teams in any role (L2-055, L2-056, ADR-015) is built: the list and the switch cover every membership, the session role is the role on the active team, and anyone may create a team (create-team). school-calendar is built (L2-059 to L2-062): the setting, child members with Add a child, closures in Settings and on the sheet, and the `.ics` import; a live calendar subscription, co-managers and a self-confirm setting are deferred. A team of one is complete on every screen (L2-057). team-settings is built (journey 18): the Team section (name, time zone, role and yearly days per member, saved on its own, read-only for a member) and the section nav. Showing the other sections read-only to a member is deferred with notification-settings.
