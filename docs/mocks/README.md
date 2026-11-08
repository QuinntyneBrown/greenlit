# Greenlit mocks

Static HTML mocks for every page, dialog and notification of Greenlit, in every state, in light and
dark, from phone to desktop. They are the design reference for the app (`AGENTS.md`: "the source of
truth for the UI") and the input for the design system extraction.

The visual language comes from the approved Magic Patterns design,
<https://project-team-vacation-calendar-905.magicpatterns.app>: the green check mark logo, the four
status colours, Inter + Plus Jakarta Sans, white cards on warm paper, and the sheet itself.

## Open the mocks

- Open [`index.html`](index.html) from disk. It lists every screen and links to every state.
- Add `?theme=dark` (or `?theme=light`) to any URL, or press `t`, or use the toggle in the mock bar.
- Add `?chrome=0` to hide the mock bar and notes (used for screenshots).
- Buttons that open a dialog or fire a toast link to that mock (`data-mock-href`), so you can click
  through the product.

## Cast and catalog

Every mock reuses this cast, so numbers agree across screens. "Today" is **Friday 6 November 2026**.

| Person | Role | Title | Days / yr | Notes |
|---|---|---|---|---|
| Maya Chen | Manager | Design Lead | 25 | Signed-in manager in every manager mock |
| Ana Ruiz | Member | Product Designer | 25 (+3 carried over) | Signed-in member in every member mock; request r1 is pending |
| Ben Okafor | Member | Senior Designer | 27 (+2 long service) | Tentative 23–27 Nov; r8 declined |
| Cleo Park | Member | UX Researcher | 25 | r2 pending |
| Dev Patel | Member | Content Designer | 20 | Works Mon–Thu; r3 pending |
| Elif Yılmaz | Member | Design Engineer | 25 | r4 pending |
| Finn Murphy | Member | Junior Designer | 22 (+1 offsite Saturday) | Joined Sep 2025 |

- Team: **Design team**, time zone Europe/London, public holidays: United Kingdom.
- Holidays in the sheet: 1 Jan, 3 Apr, 6 Apr, 4 May, 25 May, 31 Aug, 25 Dec, 28 Dec.
- Requests r1–r4 are pending, r5–r7 approved, r8 declined, r9 cancelled. Pending requests show as
  yellow on the sheet, approved ones as green.
- "Days left" = yearly days + adjustments − confirmed days (past and booked). "Left after requests"
  also subtracts requested days; a person is "over" when that goes below zero.
- Status colours: green confirmed, yellow requested, blue tentative, red weekend or holiday. Text
  drawn on a status colour is always ink.

## Assumptions and open questions

1. **Scope is wider than the specs.** The mocks cover the full Magic Patterns design: allowances and
   "days left", the coverage "Out" row, the Year overview, the Requests ledger, person pages with
   adjustments and part-time working days, and five settings sections. `AGENTS.md` and ADR-003 say
   Greenlit has no balances and no half days. Before implementing any of those screens the specs
   (`docs/specs/`), detailed designs and ADRs need to be extended to match (ATDD: requirement →
   design → mock → test → code). Nothing here changes the specs.
2. **`calendar`, not `sheet`.** The design and these mocks call the main screen Calendar
   (`pages/calendar`, route `/`). The app currently routes `/sheet` with `body[data-page="sheet"]`
   and `e2e/fixtures/routes.ts` keys `sheet`. One of the two must be renamed when the screen is
   implemented.
3. **Requirement IDs are L1 only.** Only L1-001…L1-008 and L2-001/002 exist. Mocks trace to the L1
   IDs they serve; L2 IDs belong in the manifest once the specs are written.
4. **Buttons that edit open dialogs.** The Magic Patterns design edits inline (decline reason,
   invite, add holiday, adjust allowance, working days). `AGENTS.md` forbids inline forms in pages,
   so these are dialogs (`dialogs/…`).
5. **Colour is never the only carrier.** Cells on the sheet carry a glyph (✓ confirmed, … requested,
   ? tentative) as well as an accessible name, per L1-007. The design had colour and `aria-label`
   only; the glyph is an addition. Mini-calendar days on the person page rely on the number and
   accessible name.
6. **Team name and time zone** appear in Settings → Team and in the create-team page (L1-001). The
   design had neither.
7. **Sign in, password reset, invitation and account pages** are not in the design. They follow
   L1-006 (email and password; managers invite by email, there is no self sign-up) and reuse the
   same components.
8. **Pending requests paint the sheet yellow, approved ones green.** The design's ledger code was
   not visible; this is the reading that matches the legend.
9. **Fonts.** Inter and Plus Jakarta Sans are named first in the font stacks, but mocks load no
   network fonts, so a machine without them falls back to system fonts.
10. **Dark theme** was not in the design. It is derived from the same tokens: ink surfaces, paper
    text, and the status colours kept with ink text on top.
11. **Illustrative data.** `calendar/coverage-short`, `person/over-allowance`, `person/edge` and
    some `requests/long` rows add invented data to show states the base cast does not reach; each
    says so in a mock note or is obvious from the names.

## Re-check and re-screenshot

```sh
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks
```

Screenshots go to `docs/mocks/.cache/mocks/` (git-ignored via `.cache/`) with a contact sheet.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

States outside these columns (`failed`, `unavailable`, and the Google states `google-busy`, `google-error`, `google-unverified`, `google-new-account` on sign-in and `google-busy`, `google-mismatch`, `google-error` on accept-invite) are listed in `manifest.json` and on `index.html`.

### Pages

| Screen | default | loading | empty | error | invalid | submitting | success | member | selected | painting | over-allowance | coverage-short | other-month | offline | sorted | approved | declined | bulk | member-empty | long | forbidden | not-found | edge | read-only | holidays-empty | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | [✅](pages/sign-in/loading.html) | ➖ | [✅](pages/sign-in/error.html) | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) | [✅](pages/sign-in/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-006` |
| Forgot password (`forgot-password`) | [✅](pages/forgot-password/default.html) | [✅](pages/forgot-password/loading.html) | ➖ | [✅](pages/forgot-password/error.html) | [✅](pages/forgot-password/invalid.html) | [✅](pages/forgot-password/submitting.html) | [✅](pages/forgot-password/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-006` |
| Reset password (`reset-password`) | [✅](pages/reset-password/default.html) | [✅](pages/reset-password/loading.html) | ➖ | [✅](pages/reset-password/error.html) | [✅](pages/reset-password/invalid.html) | [✅](pages/reset-password/submitting.html) | [✅](pages/reset-password/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-006` |
| Accept invitation (`accept-invite`) | [✅](pages/accept-invite/default.html) | [✅](pages/accept-invite/loading.html) | ➖ | [✅](pages/accept-invite/error.html) | [✅](pages/accept-invite/invalid.html) | [✅](pages/accept-invite/submitting.html) | [✅](pages/accept-invite/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-006`, `L1-001` |
| Create team (`create-team`) | [✅](pages/create-team/default.html) | [✅](pages/create-team/loading.html) | ➖ | [✅](pages/create-team/error.html) | [✅](pages/create-team/invalid.html) | [✅](pages/create-team/submitting.html) | [✅](pages/create-team/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-001` |
| Calendar (`calendar`) | [✅](pages/calendar/default.html) | [✅](pages/calendar/loading.html) | [✅](pages/calendar/empty.html) | [✅](pages/calendar/error.html) |  |  |  | [✅](pages/calendar/member.html) | [✅](pages/calendar/selected.html) | [✅](pages/calendar/painting.html) | [✅](pages/calendar/over-allowance.html) | [✅](pages/calendar/coverage-short.html) | [✅](pages/calendar/other-month.html) | [✅](pages/calendar/offline.html) |  |  |  |  |  |  |  |  |  |  |  | `L1-002`, `L1-003`, `L1-004`, `L1-007` |
| Year (`year`) | [✅](pages/year/default.html) | [✅](pages/year/loading.html) | [✅](pages/year/empty.html) | [✅](pages/year/error.html) |  |  |  | [✅](pages/year/member.html) |  |  |  |  |  |  | [✅](pages/year/sorted.html) |  |  |  |  |  |  |  |  |  |  | `L1-002` |
| Requests (`requests`) | [✅](pages/requests/default.html) | [✅](pages/requests/loading.html) | [✅](pages/requests/empty.html) | [✅](pages/requests/error.html) |  |  |  | [✅](pages/requests/member.html) |  |  |  |  |  |  |  | [✅](pages/requests/approved.html) | [✅](pages/requests/declined.html) | [✅](pages/requests/bulk.html) | [✅](pages/requests/member-empty.html) | [✅](pages/requests/long.html) |  |  |  |  |  | `L1-003`, `L1-004` |
| Person (`person`) | [✅](pages/person/default.html) | [✅](pages/person/loading.html) | ➖ | [✅](pages/person/error.html) |  |  |  | [✅](pages/person/member.html) |  |  | [✅](pages/person/over-allowance.html) |  |  |  |  |  |  |  |  |  | [✅](pages/person/forbidden.html) | [✅](pages/person/not-found.html) | [✅](pages/person/edge.html) |  |  | `L1-001`, `L1-003`, `L1-004` |
| Settings (`settings`) | [✅](pages/settings/default.html) | [✅](pages/settings/loading.html) | ➖ | [✅](pages/settings/error.html) | [✅](pages/settings/invalid.html) | [✅](pages/settings/submitting.html) | [✅](pages/settings/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/settings/read-only.html) | [✅](pages/settings/holidays-empty.html) | `L1-001`, `L1-005`, `L1-006` |
| Account (`account`) | [✅](pages/account/default.html) | [✅](pages/account/loading.html) | ➖ | [✅](pages/account/error.html) | [✅](pages/account/invalid.html) | [✅](pages/account/submitting.html) | [✅](pages/account/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-006` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-002` |
| Forbidden (`forbidden`) | [✅](pages/forbidden/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-006` |
| Server error (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-002` |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-007` |
| Session expired (`session-expired`) | [✅](pages/session-expired/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L1-006` |
| Marketing page (`marketing`) | [✅](pages/marketing/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

### Dialogs

| Screen | default | busy | invalid | failed | over-allowance | approved | declined | member | scroll | success | taken | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Request time off (`new-request`) | [✅](dialogs/new-request/default.html) | [✅](dialogs/new-request/busy.html) | [✅](dialogs/new-request/invalid.html) | [✅](dialogs/new-request/failed.html) | [✅](dialogs/new-request/over-allowance.html) |  |  |  |  |  | [✅](dialogs/new-request/taken.html) | `L1-003` |
| Request detail (`request-detail`) | [✅](dialogs/request-detail/default.html) | [✅](dialogs/request-detail/busy.html) | ➖ | [✅](dialogs/request-detail/failed.html) |  | [✅](dialogs/request-detail/approved.html) | [✅](dialogs/request-detail/declined.html) | [✅](dialogs/request-detail/member.html) | [✅](dialogs/request-detail/scroll.html) |  |  | `L1-004` |
| Decline request (`decline-request`) | [✅](dialogs/decline-request/default.html) | [✅](dialogs/decline-request/busy.html) | ➖ | [✅](dialogs/decline-request/failed.html) |  |  |  |  |  |  |  | `L1-004` |
| Cancel request (`cancel-request`) | [✅](dialogs/cancel-request/default.html) | [✅](dialogs/cancel-request/busy.html) | ➖ | [✅](dialogs/cancel-request/failed.html) |  |  |  |  |  |  |  | `L1-003` |
| Remove member (`remove-member`) | [✅](dialogs/remove-member/default.html) | [✅](dialogs/remove-member/busy.html) | ➖ | [✅](dialogs/remove-member/failed.html) |  |  |  |  |  |  |  | `L1-001` |
| Invite a member (`invite-member`) | [✅](dialogs/invite-member/default.html) | [✅](dialogs/invite-member/busy.html) | [✅](dialogs/invite-member/invalid.html) | [✅](dialogs/invite-member/failed.html) |  |  |  |  |  | [✅](dialogs/invite-member/success.html) |  | `L1-006` |
| Add a day off (`add-holiday`) | [✅](dialogs/add-holiday/default.html) | [✅](dialogs/add-holiday/busy.html) | [✅](dialogs/add-holiday/invalid.html) | [✅](dialogs/add-holiday/failed.html) |  |  |  |  |  |  |  | `L1-005` |
| Remove holiday (`remove-holiday`) | [✅](dialogs/remove-holiday/default.html) | [✅](dialogs/remove-holiday/busy.html) | ➖ | [✅](dialogs/remove-holiday/failed.html) |  |  |  |  |  |  |  | `L1-005` |
| Adjust allowance (`adjust-allowance`) | [✅](dialogs/adjust-allowance/default.html) | [✅](dialogs/adjust-allowance/busy.html) | [✅](dialogs/adjust-allowance/invalid.html) | [✅](dialogs/adjust-allowance/failed.html) |  |  |  |  |  |  |  | `L1-001` |
| Edit working days (`edit-working-days`) | [✅](dialogs/edit-working-days/default.html) | [✅](dialogs/edit-working-days/busy.html) | [✅](dialogs/edit-working-days/invalid.html) | [✅](dialogs/edit-working-days/failed.html) |  |  |  |  |  |  |  | `L1-001` |
| Account menu (`user-menu`) | [✅](dialogs/user-menu/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  | `L1-006` |
| Sign out (`sign-out`) | [✅](dialogs/sign-out/default.html) | [✅](dialogs/sign-out/busy.html) | ➖ |  |  |  |  |  |  |  |  | `L1-006` |

### Notifications

| Screen | info | success | warning | danger | with-action | stacked | persistent | Requirements |
|---|---|---|---|---|---|---|---|---|
| Calendar toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) | [✅](notifications/toast/with-action.html) | [✅](notifications/toast/stacked.html) |  | `L1-003`, `L1-004` |
| Request toast (`request-toast`) | [✅](notifications/request-toast/info.html) | [✅](notifications/request-toast/success.html) | [✅](notifications/request-toast/warning.html) | [✅](notifications/request-toast/danger.html) | [✅](notifications/request-toast/with-action.html) |  |  | `L1-004` |
| Settings toast (`settings-toast`) | [✅](notifications/settings-toast/info.html) | [✅](notifications/settings-toast/success.html) | [✅](notifications/settings-toast/warning.html) | [✅](notifications/settings-toast/danger.html) | [✅](notifications/settings-toast/with-action.html) |  |  | `L1-001`, `L1-005` |
| Connection banner (`offline-banner`) | [✅](notifications/offline-banner/info.html) | [✅](notifications/offline-banner/success.html) | [✅](notifications/offline-banner/warning.html) | [✅](notifications/offline-banner/danger.html) |  |  | [✅](notifications/offline-banner/persistent.html) | `L1-007` |
| Settings banner (`settings-banner`) | [✅](notifications/settings-banner/info.html) | [✅](notifications/settings-banner/success.html) | [✅](notifications/settings-banner/warning.html) | [✅](notifications/settings-banner/danger.html) |  |  | [✅](notifications/settings-banner/persistent.html) | `L1-001`, `L1-006` |

<!-- coverage:end -->
