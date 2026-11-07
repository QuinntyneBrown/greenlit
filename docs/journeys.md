# User journeys

The user journeys planned for Greenlit, drawn from the mocks (`docs/mocks`), the requirements
(`docs/specs`) and the detailed designs (`docs/detailed-designs`). They are ordered by the value
each adds to the product, highest first. The order follows what replacing the team's vacation
sheet needs first: see the month, colour days, then request and approve.

Effort is in working days for one intermediate developer. Each estimate covers the backend
(API, handlers, persistence), the Angular screens and components, and the acceptance tests the
ATDD rule requires (API integration tests and Playwright with page objects). The estimates
assume today's codebase: the solution skeleton, authentication plumbing, a ping endpoint, and
the app shell (L2-049) with the design tokens, the top bar, the Main navigation, the not-found
page and the first reusable `gl-*` components (button, empty state, error page, avatar, badge,
count pill, alert, inline message, skeleton). The calendar grid, the top bar's team name and
account menu, and the pending count arrive with the journeys that need them.

| # | Journey | Description | Effort (days) |
|---|---|---|---|
| 1 | View the team's month | Everyone sees the month sheet: coloured cells, days left, who's out. | 0 (built) |
| 2 | Sign in | Email and password sign-in that opens the team's calendar. | 0 (built) |
| 3 | Create a team | Manager sets name, time zone, public holidays and first members. | 0 (built) |
| 4 | Mark days on the calendar | Members paint their days tentative, requested or clear; managers confirm; undo. | 6 |
| 5 | Invite a member | Manager adds a row and emails a seven-day invitation. | 3 |
| 6 | Accept an invitation | Invitee sets name and password, then lands on the sheet. | 2.5 |
| 7 | Send a time-off request | Member asks for days with a note; sees days left. | 3 |
| 8 | Approve a request | Manager confirms requested days, member is emailed, coverage warned, undo. | 3 |
| 9 | Review requests | Manager sees pending requests with overlaps, opens detail, approves in bulk. | 5 |
| 10 | Decline a request | Manager declines with optional reason; days return to tentative. | 2 |
| 11 | Compute allowances | Yearly days, used, booked, requested and left; over-allowance warnings. | 4 |
| 12 | Select days and use the keyboard | Select ranges by drag or arrow keys; act from selection bar. | 5 |
| 13 | Follow and cancel own requests | Member sees upcoming and past requests and cancels pending ones. | 2.5 |
| 14 | Manage team holidays | Manager adds and removes team holidays, shown red for everyone. | 3 |
| 15 | Set working days | Team work week and part-time days per member, never booked. | 3 |
| 16 | Get feedback on actions | Toasts confirm every change, with undo and retry where possible. | 2 |
| 17 | Set the coverage minimum | Manager sets fewest people in; short days flagged on sheet. | 2 |
| 18 | Edit team settings | Manager edits name, time zone, roles, yearly days; members read-only. | 3 |
| 19 | Reset a forgotten password | Emailed one-hour, single-use link to choose a new password. | 2.5 |
| 20 | Use the account menu and sign out | Account menu, confirmed sign-out, and a clear expired-session page. | 1.5 |
| 21 | View the team's year | Twelve months per member plus a sortable allowance usage table. | 4 |
| 22 | View a person's page | Allowance, year at a glance and time off for one member. | 4 |
| 23 | Adjust a member's allowance | Manager adds or removes days with a required reason. | 2 |
| 24 | Remove a member | Manager removes someone, keeping history and blocking their sign-in. | 2 |
| 25 | Send email notifications | Switches for new-request emails to manager and decision emails to members. | 1.5 |
| 26 | Stay informed offline | Banner when offline; Greenlit stays read-only until the connection returns. | 3 |
| 27 | Manage the account | Change display name, email and password from the Account page. | 2.5 |
| 28 | See clear error pages | Forbidden, server error and offline pages with recovery (not found is built). | 1 |
| | **Total remaining** | | **73** |

## Notes

- Journey 3 is built: `POST /api/teams`, the `/create-team` page with all its states, and
  `teamGuard`, which sends a signed-in person on no team there. Holidays come from offline rules
  for GB, IE and US (ADR-005). Emailing the first rows their invitations (L2-008 AC5) arrives
  with journey 5; the emails are stored on the rows meanwhile. `greenlit seed` adds four
  newcomers on no team (Noor, Priya, Sam, Tomás); the e2e run that creates teams needs a fresh
  database from `eng/Start-E2eApi.ps1`.

- Journey 2 is built: `POST /api/auth/sign-in`, the `/sign-in` page with all its states, and
  `authGuard`, which sends a visitor without a session to sign-in and back. Every demo account
  signs in with the password `greenlit-demo`. Rate limiting is left open (see the sign-in design).

- Journey 1 is built. Three of its criteria arrive with the journeys that own their data: the
  Left figures (L2-014 AC1) with journey 11, part-time working days (L2-013 AC2, L2-014 AC3) with
  journey 15, and coverage flags (L2-042 AC1) with journey 17. The grid already renders all three.

- Journeys 11, 21, 22 and 23 depend on allowances, which ADR-003 currently puts out of scope. A
  superseding ADR is needed before they start (see `docs/detailed-designs/README.md`).
- Journey 12 is a stated product rule, not an extra. Every interaction on the sheet must work
  with the keyboard on a desktop and with touch on a phone (`AGENTS.md`), so it should not slip
  far behind journey 4.
- `docs/estimates/` is the place for per-design estimates with percent complete; this file is
  the journey-level view.
