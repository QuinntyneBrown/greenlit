# Estimates: teams

| Design | Effort | Complete |
|---|---|---|
| coverage-minimum | 2 days | 100% |
| create-team | 3 days | 100% |
| invite-member | 3 days | 100% |
| manage-holidays | 3 days | 100% |
| notification-settings | 2 days | 0% |
| remove-member | 2 days | 0% |
| team-settings | 3 days | 90% |
| working-days | 3 days | 100% |

- coverage-minimum is built (journey 17): the Settings stepper and its save, and the Out row and request dialog flags. invite-member is built (journey 5). working-days is built (journey 15): the team work week in Settings, a part-timer's days in a dialog opened from the Team list until the person page exists (journey 22). manage-holidays is built (journey 14): the holiday list, add, remove with Undo, and the next-year review banner; importing a calendar after creation is deferred. team-settings is built (journey 18): the Team section (name, time zone, role and yearly days per member, saved on its own, read-only for a member) and the section nav. Showing the other sections read-only to a member is deferred with notification-settings.
