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
| 4 | Mark days on the calendar | Members paint their days tentative, requested or clear; managers confirm; undo. | 0 (built) |
| 5 | Invite a member | Manager adds a row and emails a seven-day invitation. | 0 (built) |
| 6 | Accept an invitation | Invitee sets name and password, then lands on the sheet. | 0 (built) |
| 7 | Send a time-off request | Member asks for days with a note; sees days left. | 0 (built) |
| 8 | Approve a request | Manager confirms requested days, member is emailed, coverage warned, undo. | 0 (built) |
| 9 | Review requests | Manager sees pending requests with overlaps, opens detail, approves in bulk. | 0 (built) |
| 10 | Decline a request | Manager declines with optional reason; days return to tentative. | 0 (built) |
| 11 | Compute allowances | Yearly days, used, booked, requested and left; over-allowance warnings. | 0 (built) |
| 12 | Select days and use the keyboard | Select ranges by drag or arrow keys; act from selection bar. | 0 (built) |
| 13 | Follow and cancel own requests | Member sees upcoming and past requests and cancels pending ones. | 0 (built) |
| 14 | Manage team holidays | Manager adds and removes team holidays, shown red for everyone. | 0 (built) |
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
| | **Total remaining** | | **42** |

## Notes

- Journey 14 is built (ADR-008). `GET /api/team/holidays` (manager only) lists the current year's holidays, the source (`Team.HolidayCountry`, set at creation) and a `review` for next year; `POST` adds a day off (409 `holiday_exists`, 400 `day_is_weekend`, and it clears days members already booked on the date); `DELETE .../{id}` soft-deletes (`RemovedUtc`) and `POST .../{id}/restore` is Undo. Settings shows Work week & holidays to the manager only, with the working-day chips read-only until journey 15. New `gl-*` components: `gl-holiday-list`, `gl-day-chips`. Deferred: importing a public-holiday calendar after creation ("Review holidays" only jumps to the section).
- Journey 13 is built. A member's `/requests` is My requests (`GET /api/requests/mine`: `managerName`, Upcoming = pending,
  Past = decided or cancelled), served by a second route after the manager's ledger (`managerMatch`). `gl-request-list` has
  a `mine` mode. "Cancel request" opens the cancel dialog (`POST /api/requests/{id}/cancel`, 204; 404 `request_not_found`
  for anyone else's, 409 `request_not_pending`); a cancelled request is Past, stamped decided, and its days return to
  Tentative (blue). Deferred: the member's request detail drawer (`dialogs/request-detail/member`), which no acceptance
  criterion needs.
- Journey 12 is built. Select is the default mode: a click, a drag (mouse or finger) or Enter then the arrow
  keys (or Shift+arrows) selects a range on one row, and `gl-selection-bar` ("Selected days", a toolbar
  after the sheet) offers Confirm (manager only), Request, Tentative, Clear and Clear selection, with
  "n days over allowance" computed on the client from the member's allowance figures. An action is the same
  `PUT /api/sheet/days` a paint stroke makes, so no backend changed. The grid is one roving tab stop with
  arrows, Home, End, Ctrl+Home/End and PageUp/PageDown for months; Escape clears ("Selection cleared"). The
  paint picker was also stopped from widening a phone's screen for the manager. Dragging across a whole
  month on a phone needs the sheet scrolled so both ends are on screen; the keyboard and Shift+click reach
  further.

- Journey 11 is built, except the Settings page (journey 18). Allowances are computed on read by `AllowanceCalculator`
  (ADR-007, which supersedes ADR-003's "no balances"; the ADR the prompt called ADR-004 is ADR-007 because ADR-004 was
  taken): `Team.DefaultYearlyDays` (25), `LeaveYearStartMonth` (1), `MaxCarryOver` (5), `TeamMember.YearlyDays` (null: the
  default) and `AllowanceAdjustment` rows (journey 23 adds them from the UI; the seed has Ana +3, Ben +2, Finn +1) with
  migration `AddAllowances`. `GET /api/sheet` rows carry `daysLeft` (Left) and `allowance` (yearlyDays, adjustments,
  allowance, used, booked, requested, tentative, left); the Left column shows `daysLeft`, negative with a minus sign.
  `GET /api/requests/quote` also answers `daysAvailable` and `daysOver`: the dialog says "You have 6 days left to
  request.", then "2 days from your allowance. 4 days left after this." or "10 days from your allowance. That's 4 days
  over." and still sends. `PUT /api/sheet/days` answers `daysOver` and a Requested stroke over the allowance toasts
  "That's 1 day over your allowance." (new mock `notifications/toast/over-allowance`, L2-030 AC5). `GET
  /api/requests/{id}` answers `daysLeftAfter` (Left minus Requested) for "Days left after". `GET /api/team/settings` and
  `PUT /api/team/settings/allowances` (manager only; negative days `400`, "Enter 0 or more days.") exist with
  `membersWithoutAllowance`, but the Allowances section and the "Two members have no allowance set" banner on Settings
  are journey 18. "Today" is the existing `TimeProvider`, not a new `IClock`. Carry-over is manual (an adjustment), with
  no year-end step. The over test counts pending requested days: over = requested + new days - left. The selection
  bar's "n days over allowance" (L2-016 AC5) arrives with journey 12; the person page and year table (21, 22) read the
  same figures. The seed gives Ana the person-page mock's year (17 used, 5 requested, 3 tentative = 11 left of 28); the
  other members' used days are the seeded approved requests, so their Left differs from the year mock.

- Journey 10 is built. `POST /api/requests/{id}/decline` with `{ reason }` (manager only, own team only: an id that is
  unknown or on another team is the same `404 request_not_found`, a member `403 forbidden`, a request that is not
  Pending `409 request_not_pending`, a reason over 500 characters `400`) records the reason (blank is none), moves the
  request to Declined and its days to Tentative, still linked to it, then emails the member through `IEmailSender`
  (subject "Your time off request was declined", the reason quoted when given); it answers a `DeclineResult` whose
  `emailed` is false when the member has no address or the mail failed, and the toast then drops "has been emailed".
  Undo is `POST /api/requests/{id}/reopen`, which now accepts a Declined request as well as an Approved one: it is
  Pending again without its reason and the days still Tentative and linked to it are Requested again (the 409 code
  is now `request_not_decided`). Without a reason the toast says "Ben has been emailed." New: `gl-textarea-field`,
  the dialog's `tone` icon, the request list's `declined` output; the frontend `RequestService` gains `decline`. The
  request detail's footer has Decline (it closes the drawer and the page opens the dialog). Deferred: editing a
  decision after the undo window.

- Journey 9 is built, except what later journeys own. `GET /api/requests?status=` now returns, per request, `overlaps`
  (the other members out, Requested or Confirmed, on its days, each with their first and last overlapping day),
  `decidedUtc` and `declineReason`; `status=Declined` also lists Cancelled requests and `status=Cancelled` only
  those. `GET /api/requests/counts` returns `{ pending, approved, declined }` (Declined includes Cancelled) for the
  tab counts and the pending pill on Requests in the main navigation (manager only; the shell reads it again after
  every navigation and every decision, and a member's session never asks). `GET /api/requests/{id}` (manager only;
  an id that is unknown or on another team is the same `404 request_not_found`) returns the request and every
  member's days from the Monday of its first week to the Sunday of its last with the Out row. Bulk approve needed no
  new endpoint: the page sends the ticked ids to journey 8's `POST /api/requests/approve`, all or none, and shows one
  "Approved 3 requests" toast whose Undo reopens each. `TimeOffRequest.DeclineReason` is new (migration
  `AddDeclineReason`): journey 10 writes it, the ledger and the detail only read it. For a request with no days
  linked (declined days stay linked as Tentative in the seed; a cancelled request has none) the days count is its
  range's working days. The demo seed now holds the ledger of the mocks: a fourth pending request (Elif, 29-31 Dec),
  three approved, one declined with a reason and one cancelled. New `gl-*` pieces: `gl-tabs`, `gl-request-list`
  rows with a tick, overlaps and status, `gl-app-nav` badge, `gl-team-grid` `showLeft`, `gl-drawer` `footer`; one mock
  was added (`notifications/request-toast/bulk`). Deferred to later journeys: the Decline button on a pending row and
  in the detail (journey 10), "Days left after" in the detail (journey 11), and "Ana updated her note" (L2-023 AC5),
  which needs a way for a member to edit a request's note and is not designed yet. L2-022 AC6 changed from "wrap"
  to what the mock and design system show: the row keeps a long note to one line and carries it as its tooltip, and
  the detail shows it in full.

- Journey 8 is built, with a minimal Requests page. `GET /api/requests?status=` (manager only; default Pending, oldest
  first), `POST /api/requests/approve` (`{ ids }`, manager only, own team only, all or nothing) and
  `POST /api/requests/{id}/reopen` (Undo) are new. Approving sets the request Approved and every linked day
  Confirmed in one save, then looks at coverage and emails the member through `IEmailSender` (`RequestNotifier`;
  logged until a provider is chosen, ADR-006). The email is always sent: the Decisions switch is journey 25, which
  must make `RequestNotifier` read it. A member with no address, or a mail failure, does not undo the approval
  (`emailed` is false and the toast drops "and Ana has been emailed"). Undo sends no second email. `Team.CoverageMinimum`
  (0 = none) is new, with a migration, so the warning "Approved, but only 3 people will be in on 18 Nov" can work; the
  demo seed sets it to 4, and journey 17 adds the Settings control and the calendar's Out row flags (L2-042 AC1, AC3).
  `/requests` shows the pending list only, with Approve per row and a name that opens the request detail drawer
  (status, sent date, note, Approve with "Approving…" and "Try approving again"); a member who opens it is sent to the
  calendar. (Journey 9 has since added the tabs, selection, overlaps, "Team those weeks" and bulk approve.) Journey 10 adds Decline,
  journey 11 "Days left after", journey 13 My requests. New `gl-*` components: `gl-request-list`, `gl-request-status`,
  `gl-drawer`, the button's `approve` variant; one mock was added (`pages/requests/approving`).

- Journey 7 is built, except days left: `GET /api/requests/quote` and `POST /api/requests` (any signed-in
  member, own row only) create a `TimeOffRequest` and turn its working days Requested; a last day before
  the first is `400 end_before_start`, a range with no working day `400 all_non_working` or
  `day_is_holiday`, and days already requested or confirmed `409 days_taken`. `RequestLedger` also makes
  painted Requested days a pending request (L2-015 AC5), and the demo seed gives the November Requested
  days their requests. The dialog opens from a "Request time off" button on the member's calendar (My
  requests and the person page are journeys 13 and 22). The dialog counts working days but cannot say
  "days left" or "N days over" until allowances exist (journey 11, which must add `daysLeftAfter` and
  `over` to the quote and update the dialog's wording to the `default` and `over-allowance` mocks). One
  mock was added (`dialogs/new-request/taken`) and the member calendar mock gained the button. The
  toast "Request sent" does not link to the request yet, and the manager's email is journey 25.

- Journey 6 is built: `GET /api/invitations/{token}` and `POST /api/invitations/{token}/accept` are
  anonymous (the token is the credential). An unknown token is `404 invitation_not_found` and names no
  one; a used, replaced or expired one is `410 invitation_expired` with the manager's name. Accepting
  creates the user with the invitation's email and the chosen role, links the row (days kept), signs the
  person in and shows "You're in" before opening the calendar. An email that already has an account is
  `409 account_exists`. The `/accept-invite/:token` page has loading, form, expired, unavailable, failed
  and joined states (two mocks, `failed` and `unavailable`, were added). The e2e suite reads the link
  from the API log (ADR-006).

- Journey 5 is built: `POST /api/team/members` (manager only) adds the row and emails a link that
  works for seven days; only the token's hash is stored (ADR-006). Inviting an address that has not
  joined sends a new link and retires the old one; one that has joined is refused with
  `member_exists`; an email that cannot be sent leaves nothing behind. Create-team now invites its
  first rows (L2-008 AC5, AC7). Emails go to the application log through `IEmailSender` until a
  provider is chosen. The dialog opens from a minimal `/settings` Team section (member names and
  "Invite a member"; the rest of Settings is journey 18) built on the new `gl-dialog` and
  `gl-member-list`. The invitee's side is journey 6. The first EF migration (`InitialSchema`,
  SQL Server) arrives with it, because no earlier journey had added any. `greenlit seed` adds Uma,
  Vic and Wren, who each manage a team of their own for the invite spec, since nobody can be removed
  from the demo team yet (journey 17).

- Journey 4 is built: `PUT /api/sheet/days` and `POST /api/sheet/days/restore` apply ADR-003's
  rules in `DayChanger` and `DayChangePolicy`, and the calendar has the paint picker, press and
  drag painting (mouse, finger, Enter or Space on a focused cell), the Undo toast and the
  rolled-back failed save. The minimum `gl-toast` and `ToastService` are built for journey 16 to
  extend. Left for later journeys: Select mode (journey 12; the picker offers it, and it does
  nothing yet) and the pending request a member's Requested days join (journey 7), so the
  "will be notified" toast promises an email journey 25 sends.

- Journey 3 is built: `POST /api/teams`, the `/create-team` page with all its states, and
  `teamGuard`, which sends a signed-in person on no team there. Holidays come from offline rules
  for GB, IE and US (ADR-005). Emailing the first rows their invitations (L2-008 AC5) arrived
  with journey 5. `greenlit seed` adds four
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
