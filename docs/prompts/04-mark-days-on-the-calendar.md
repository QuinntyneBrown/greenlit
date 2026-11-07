# Feature: Mark days on the calendar

Journey 4 of 28 in `docs/journeys.md`. Estimated effort: 6 days for one intermediate developer.

## Goal

On the calendar, a member paints their own days Tentative, Requested or clear, and the manager can also Confirm any member's days, by clicking or dragging across cells with a paint colour chosen in the paint picker. Weekends, holidays and non-working days cannot be painted. Every change shows a toast with Undo, and a failed save rolls the cells back and says so.

Requirements: L2-015 (Paint mode), L2-017 (Who can change which days), L2-018 (Undo and failed saves on the calendar) in `docs/specs/L2.md`. Detailed design: `docs/detailed-designs/sheet/mark-days/README.md`. Build on journey 1 (View the team's month) from `docs/journeys.md`. If it is not built yet, build only the minimum of it this journey needs, behind the same contracts its design names, and say so in the PR.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: aligning the requirement, design and mock, the components it needs, implementation and the estimates, green tests and a PR. Go through
  every phase and every slice in one continuous run. Do not pause between phases to report, ask for approval,
  or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR
  or the design's open-questions section, if the repo has them), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow the repo's agent instructions (`AGENTS.md`) exactly, especially:
  - Every production change needs a requirement, a detailed design and a mock first, then the
    `implementing-incrementally` skill with ATDD: write the acceptance test and watch it fail for the
    expected reason before any production code. No bulk implementation, no tests added afterwards.
  - Back end: integration tests against the API in `backend/tests/Greenlit.Api.Tests` on per-fixture
    in-memory SQLite (no database server); Application rules in MediatR handlers, never controllers;
    strict layers Domain → Application → Infrastructure → Api; endpoints authenticated by default with
    intentional `[AllowAnonymous]` only; team-owned data scoped to the caller's team; members edit only
    their own days; only the manager confirms; errors are ProblemDetails with a `code` extension where the
    client branches on them. The API never applies migrations on startup: add EF migrations for SQL Server
    in `Greenlit.Infrastructure` and apply them with `greenlit migrate`; SQLite builds the schema from the
    model. Keep seed data idempotent and extend the demo team seed when the e2e tests need data.
  - Front end: Playwright with the Page Object Model (one page object per screen in `e2e/pages/`, no
    selectors in tests, specs import from `e2e/fixtures/gl-test.ts`, routes keyed in
    `e2e/fixtures/routes.ts`), Chromium only. Visual baselines change only for intentional design changes,
    after the mock.
  - Angular: `gl-*` selectors in `frontend/projects/components` with class names without the `Gl` prefix;
    keep the mocks' BEM classes and ARIA state attributes; tokens by role, never hex; declare each
    `ng-content` slot once; API services have a contract and injection token in `frontend/projects/api`
    and pages depend on the token; `app.config.ts` is the composition root; route data `shell` and `page`
    drive the chrome and `<body data-page>`; no inline forms: button-triggered editing opens a CDK Dialog
    in `frontend/projects/greenlit/src/app/dialogs/` or navigates.
  - The sheet must work with touch on a phone and the keyboard on a desktop, and a cell's colour is never
    the only carrier of its state.
  - Never write architecture tests (structure, naming, banned-API or spec-parsing tests).
  - Domain words only: Team, Member, Day (Tentative, Requested, Confirmed), Holiday, Manager.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.

- If journey 16 (toasts) is not built yet, build the minimum `gl-toast` and toast service this journey needs, following `docs/detailed-designs/web-experience/feedback-toasts/README.md`, so journey 16 can extend it.

## Phase 1: Align the requirement, design and mock (`engineering-requirements`, `writing-software-design-documents`, `writing-html-mocks`)

- The requirement, design and mocks already exist. Read them together: L2-015 (Paint mode), L2-017 (Who can change which days), L2-018 (Undo and failed saves on the calendar); `docs/detailed-designs/sheet/mark-days/README.md`; and the mocks:
  - `docs/mocks/pages/calendar/painting.html`
  - `docs/mocks/pages/calendar/default.html`
  - `docs/mocks/pages/calendar/member.html`
  - `docs/mocks/notifications/toast/with-action.html`
  - `docs/mocks/notifications/toast/danger.html`
- Resolve every `<TO SUPPLY>` in the design that this journey touches. Pick the simplest option that fits the
  architecture and the mocks, write it into the design (and an ADR in `docs/adr/` if it is an architectural
  decision), and keep going.
- Where the three disagree, the mock is the source of truth for the UI and the requirement for behaviour.
  Fix the other artifact first, in the same branch, before code. Add missing states to the mocks with
  `writing-html-mocks` only if the behaviour needs a state no mock shows.
- Cover security and privacy: who may call each endpoint, team scoping, and what each error reveals.

## Phase 2: Components and design system (`extracting-design-systems`)

- Read the relevant pages in `docs/design-system/components/` and `docs/design-system/patterns/` for every
  component this journey's mocks use.
- Build or extend the `gl-*` components in `frontend/projects/components` that are missing, from those pages
  and the mocks' markup, before the screen that uses them. Design-system work does not need ATDD; the
  journey's acceptance tests exercise the components through the screen.
- If a component's design is missing something the mock needs, update the mock and the design-system page
  first, then the component.

## Phase 3: Incremental implementation (`implementing-incrementally`, test-first)

- Plan thin vertical slices, for example:
  1. Set-days command and endpoint (for example `PUT /api/teams/current/members/{id}/days`) applying ADR-003's transitions in an Application handler: members only their own row and only blank/Tentative/Requested; only the manager sets Confirmed; holidays rejected with code `day_is_holiday`, weekends and non-working days rejected too.
  2. The paint picker (`gl-segmented-control`) with Select, Confirmed (manager only), Requested, Tentative and Clear.
  3. Click a cell to paint it; drag across a row to paint a run; touch drag on a phone.
  4. Optimistic update with rollback and an error toast on failure.
  5. Undo toast that restores the previous statuses in one request.
- For each slice:
  - Write the Given-When-Then criteria from the acceptance criteria of L2-015, L2-017, L2-018.
  - Write the acceptance test: an API integration test in `backend/tests/Greenlit.Api.Tests` for the
    backend rule, and a Playwright spec in `e2e/tests/` with its page object in `e2e/pages/` for the
    behaviour on screen.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Run the regression checks, then commit:
    - `pwsh eng/Test-Backend.ps1` (or `dotnet test backend/Greenlit.sln`)
    - in `frontend/`: `npm run lint`, `npm run format:check`, `npm run build`
    - in `e2e/`: `npm run typecheck` and `npm run test:behavior` against the API from
      `pwsh eng/Start-E2eApi.ps1 -Build`
- When all slices are green, bring the estimates in `docs/estimates/` to their true state with the
  `estimating-designs` skill, and keep the requirement, design and mocks aligned with what was built.

## Deferred (out of scope here)

- Select mode, the selection bar and keyboard (journey 12), request records and approval flow (journeys 7 to 10).

## Done means

- Ana paints 23–25 Nov tentative and sees blue cells; Maya confirms two of Ana's days; Ana cannot paint Ben's row or a holiday; Undo restores the cells; a failed save rolls back with an error toast.
- Every acceptance criterion of L2-015, L2-017, L2-018 has a passing test that proves it.
- All the new and existing tests pass: backend, frontend lint, format and build, and the Playwright
  behaviour suite.
- The requirement, design, mocks, design-system pages and estimates agree with the code.
- The work is on a branch with a PR to `main`, following the repo's conventions. Fetch and rebase onto
  `main` first, because another session may have pushed to it.
- **MANDATORY: merge the PR IMMEDIATELY after creating it.** Do not wait for review, do not leave it
  open, and do not end the run with an open PR. Run `gh pr merge <number> --squash` (without
  `--delete-branch`) straight after `gh pr create`; if it conflicts, rebase onto `main`, resolve the
  conflicts, force-push with lease and merge. Confirm with `gh pr view <number> --json state` that
  it reads `MERGED`.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
