# Feature: View a person's page

Journey 22 of 28 in `docs/journeys.md`. Estimated effort: 4 days for one intermediate developer.

## Goal

Selecting a member's name opens their person page: days left as a big number, the facts bar, a year at a glance in mini months, and their upcoming and past time off. A member can open only their own page; the manager can open everyone's and sees manager actions.

Requirements: L2-033 (Person page), L2-034 (Manager actions on the person page), L2-035 (Person page access) in `docs/specs/L2.md`. Detailed design: `docs/detailed-designs/allowances/person-page/README.md`. Build on journey 11 (Compute allowances) from `docs/journeys.md`. If it is not built yet, build only the minimum of it this journey needs, behind the same contracts its design names, and say so in the PR.

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

- Allowances conflict with `docs/adr/ADR-003-day-status-model.md`, which says balances are out of scope. Before any allowance code, write `docs/adr/ADR-004-allowances.md` (status Accepted) that supersedes that clause: yearly days, adjustments and the days-left figures are in scope, computed from `TimeOffDay` rows, never stored as a running balance. Mark ADR-003's consequence as superseded by ADR-004 and add ADR-004 to `docs/adr/README.md`. If ADR-004 already exists, read it and follow it instead.

## Phase 1: Align the requirement, design and mock (`engineering-requirements`, `writing-software-design-documents`, `writing-html-mocks`)

- The requirement, design and mocks already exist. Read them together: L2-033 (Person page), L2-034 (Manager actions on the person page), L2-035 (Person page access); `docs/detailed-designs/allowances/person-page/README.md`; and the mocks:
  - `docs/mocks/pages/person/default.html`
  - `docs/mocks/pages/person/member.html`
  - `docs/mocks/pages/person/edge.html`
  - `docs/mocks/pages/person/over-allowance.html`
  - `docs/mocks/pages/person/loading.html`
  - `docs/mocks/pages/person/error.html`
  - `docs/mocks/pages/person/forbidden.html`
  - `docs/mocks/pages/person/not-found.html`
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
  1. Person endpoint with access rules (own page for members, any team member for the manager; others get 403/404 with codes).
  2. The person page: head with avatar and big number, facts bar, `gl-month-mini` grid, time-off run list.
  3. Manager actions area wired to journeys 15, 23 and 24 where they exist, hidden otherwise.
  4. Over-allowance, edge, loading, error, forbidden and not-found states; back link to the calendar.
- For each slice:
  - Write the Given-When-Then criteria from the acceptance criteria of L2-033, L2-034, L2-035.
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

- Adjusting the allowance (journey 23), removing the member (journey 24).

## Done means

- Maya opens Ana's page and sees the figures from the mock; Ana can open her own page but gets the forbidden state for Ben's.
- Every acceptance criterion of L2-033, L2-034, L2-035 has a passing test that proves it.
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
