# Detailed designs

One folder per subsystem and one per feature inside it: `<subsystem>/<feature>/README.md`, with C4 (context, container, component), class and sequence diagrams rendered beside it in `diagrams/`. Each design refines the L2 requirements in [`docs/specs/L2.md`](../specs/L2.md), which were written from [`docs/mocks`](../mocks/README.md), and precedes implementation (see `AGENTS.md`).

Gaps that the requirements and mocks leave open are marked `<TO SUPPLY>` in the designs. The allowance features conflict with ADR-003 ("balances are out of scope") and need a superseding ADR before implementation.

## identity-and-access

Sign-in, password reset, invitations, account and session.

| Feature | Summary | L2 requirements |
|---|---|---|
| [Sign in](identity-and-access/sign-in/README.md) | Email and password sign-in that issues the session token. | L2-001 |
| [Reset a forgotten password](identity-and-access/reset-password/README.md) | Reset link by email, valid for one hour and one use. | L2-002, L2-003 |
| [Accept an invitation](identity-and-access/accept-invitation/README.md) | Invitee sets name and password; the invitation lasts seven days. | L2-004 |
| [Sign in with Google](identity-and-access/sign-in-with-google/README.md) | Continue with Google on sign-in (existing account, or a new manager account) and Join with Google on an invitation. | L2-051, L2-052 |
| [Manage the account](identity-and-access/manage-account/README.md) | Display name, email and password change on the Account page. | L2-005 |
| [Use the account menu and sign out](identity-and-access/sign-out/README.md) | Account menu, confirmed sign-out and session expiry. | L2-006, L2-007 |

## teams

Team setup, settings, membership, holidays, working days, coverage and email switches.

| Feature | Summary | L2 requirements |
|---|---|---|
| [Create a team](teams/create-team/README.md) | Team name, time zone, public holidays and the first rows in one form. | L2-008 |
| [Edit team settings](teams/team-settings/README.md) | Settings page: sections saved separately, read-only for members. | L2-009 |
| [Run several teams](teams/switch-team/README.md) | Default team on sign-in, "Your teams" in Settings and the header team switcher. | L2-054, L2-008, L2-049 |
| [Invite a member](teams/invite-member/README.md) | Adds a row at once and emails a seven-day invitation. | L2-010 |
| [Remove a member](teams/remove-member/README.md) | Soft removal that keeps history and blocks sign-in. | L2-011 |
| [Manage team holidays](teams/manage-holidays/README.md) | Holiday list, add with duplicate and weekend checks, remove with undo. | L2-036, L2-037, L2-038 |
| [Set working days](teams/working-days/README.md) | Team work week and per-member working days for part-timers. | L2-039, L2-040 |
| [Set the coverage minimum](teams/coverage-minimum/README.md) | Stepper for the fewest people in on a working day. | L2-041 |
| [Send email notifications](teams/notification-settings/README.md) | Two switches for new-request and decision emails. | L2-043 |
| [Branded email](web-experience/branded-email/README.md) | Every email as branded HTML with a text twin, delivered through Azure Communication Services. | L2-053 |

## sheet

The month view and every way of changing a day on it.

| Feature | Summary | L2 requirements |
|---|---|---|
| [View the team's month](sheet/view-month/README.md) | Month grid, cell states, Left column and the Out row with coverage flags. | L2-012, L2-013, L2-014, L2-042, L2-048 |
| [Mark days on the calendar](sheet/mark-days/README.md) | Paint mode, the permission rules for each day, and undo. | L2-015, L2-017, L2-018 |
| [Select days and use the keyboard](sheet/select-days/README.md) | Select mode, the selection bar and the keyboard model of the grid. | L2-016, L2-047 |

## requests

Asking for time off and the manager's decisions.

| Feature | Summary | L2 requirements |
|---|---|---|
| [Send a time-off request](requests/send-request/README.md) | New request dialog with day count, days left and over-allowance warning. | L2-019, L2-030 |
| [Follow and cancel own requests](requests/my-requests/README.md) | My requests split into Upcoming and Past, with cancel. | L2-020, L2-021 |
| [Review requests](requests/review-requests/README.md) | Manager ledger by status, request detail with team view, bulk approve. | L2-022, L2-023, L2-026 |
| [Approve a request](requests/approve-request/README.md) | Confirms the days, emails the member, warns on coverage, offers undo. | L2-024, L2-042 |
| [Decline a request](requests/decline-request/README.md) | Optional reason, days back to tentative, member emailed, undo. | L2-025 |

## allowances

Allowance figures, adjustments, the year view and the person page.

| Feature | Summary | L2 requirements |
|---|---|---|
| [Compute allowances](allowances/allowance-figures/README.md) | Yearly days, defaults, leave year and the days-left figures. | L2-027, L2-029, L2-030 |
| [Adjust a member's allowance](allowances/adjust-allowance/README.md) | Signed day adjustments with a required reason. | L2-028 |
| [View the team's year](allowances/year-overview/README.md) | Month-by-month grid and the sortable allowance table. | L2-031, L2-032 |
| [View a person's page](allowances/person-page/README.md) | Allowance, year at a glance, time off, manager actions and access rules. | L2-033, L2-034, L2-035 |

## web-experience

Toasts, connection banners and error pages shared by every screen.

| Feature | Summary | L2 requirements |
|---|---|---|
| [Show the app shell and main navigation](web-experience/app-shell/README.md) | Route table, chrome, design tokens and the core gl-* components every screen reuses. | L2-049, L2-046, L2-047 |
| [Report outcomes with toasts](web-experience/feedback-toasts/README.md) | Toast lifetime, pause, undo and dismiss rules shared by every feature. | L2-044, L2-018 |
| [Handle connection changes](web-experience/connectivity/README.md) | Offline, reconnecting, unstable, back-online and sync-failure banners; read-only while offline. | L2-045 |
| [Show error pages](web-experience/error-pages/README.md) | Not found, forbidden, server error with reference, and offline pages. | L2-046 |
| [Show the marketing page](web-experience/marketing-page/README.md) | The public single page: hero sheet, video, three colours, screens, and links into the app; its own Angular application. | L2-050 |
