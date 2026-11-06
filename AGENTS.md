## Project overview

Greenlit replaces the Google Sheet that managers of small teams (under ten people) keep for
vacation. The sheet has one table per month: team members down the left, two header rows across
the top (weekday initials, then the day of the month), and a colour in every cell: red for
weekends and holidays, blue for tentative (pencilled in, not yet requested), yellow for requested
(waiting on the manager) and green for confirmed time off. Greenlit solves exactly that use case
and nothing more: a responsive web app where a member colours their own days, the manager confirms
them, and everyone sees the same month. The .NET backend owns teams, members, days and
authentication; the Angular frontend provides the app, and Playwright covers behaviour and visual
parity with the design reference.

## Repository layout

- `backend/` — .NET solution
- `frontend/` — Angular workspace (`greenlit`, `api`, `components`)
- `e2e/` — Playwright suite
- `docs/mocks/` — static design reference (the source of truth for the UI)
- `docs/specs/` — requirements (`L1.md` high level, `L2.md` detailed with acceptance criteria)
- `docs/detailed-designs/` — per-feature designs derived from the requirements
- `docs/adr/` — architecture decisions; read relevant ADRs before changing the areas they cover
- `eng/` — local engineering scripts (`Test-Backend.ps1`, `Start-E2eApi.ps1`, `Start-FreshStack.ps1`)

See `README.md` for setup and development commands.

## Domain vocabulary

Use these words in code, docs and UI; do not invent synonyms.

- **Team**: one sheet. Has one manager, a time zone, its members and its holidays.
- **Member**: a row. May be only a name until they sign in.
- **Day**: one cell for one member on one date. Carries a `DayStatus`: `Tentative` (blue),
  `Requested` (yellow), `Confirmed` (green). A day with no row is a working day.
- **Holiday**: a red day for the whole team. Weekends are red by rule, never stored.
- **Manager**: the user who confirms requests and owns holidays and membership.

## Backend architecture

Layer dependency direction (strict):

- `Greenlit.Domain` — entities + enums, zero deps
- `Greenlit.Application` — MediatR handlers, validators, DTO contracts, `IAppDbContext`
- `Greenlit.Infrastructure` — `AppDbContext`, EF configurations and migrations, SQL Server / SQLite, auth services
- `Greenlit.Api` — controllers, `Program.cs`, DI composition, Swagger, middleware
- `Greenlit.Cli` — `greenlit migrate` / `seed` / `reset`

Non-obvious rules:

- Business rules live in handlers/domain services, not controllers.
- The API does **not** apply EF migrations on startup. Run `greenlit migrate` explicitly. SQLite
  (tests and the e2e API) has no migrations: the schema comes from the model on startup.
- Seed data is idempotent and safe to re-run.
- Endpoints require authentication by default (fallback policy). Preserve intentional
  `[AllowAnonymous]` access and keep Swagger above `UseAuthentication` when changing API auth.
- Keep request logging outside the exception-handling middleware so handled response statuses
  are logged correctly.
- Team-owned data must stay scoped to the caller's team; a member sees only their own team and
  edits only their own days; only the manager confirms.
- Errors are ProblemDetails with a `code` extension where a client needs to branch on them.

### Tests

Tests never need a database server: API and Infrastructure tests run on a per-fixture in-memory
SQLite database, Application and CLI tests on SQLite or EF Core InMemory. API tests run
sequentially (`xunit.runner.json`). Follow the existing test-project patterns when adding
coverage; `pwsh eng/Test-Backend.ps1` runs the suite as CI does.

Playwright runs against the API started by `eng/Start-E2eApi.ps1` (SQLite, seeded demo team; no
LocalDB).

## Frontend architecture

Workspace has three projects under `frontend/projects/`: `greenlit` (the app), `api` (service
contracts, implementations, view models, pure helpers) and `components` (`gl-*` UI atoms, the
design system).

### Conventions enforced across the codebase

- Prettier (`frontend/.prettierrc`) owns formatting and angular-eslint (`frontend/eslint.config.js`)
  owns lint; CI fails on either. Run `npm run lint` and `npm run format:check` in `frontend/`. The
  husky pre-commit hook fixes staged frontend files.
- Component selectors use `gl-*`; TypeScript class, file, and folder names omit the `Gl` prefix.
- Components preserve the mock design's BEM classes and accessible state semantics; e2e locators
  depend on that parity.
- Keep component styles encapsulated and global styles limited to shared foundations and utilities.
- Read design tokens by role, never hex values, once the token set lands in `components`;
  component-scoped knobs keep the `--gl-` prefix.
- **Declare each `ng-content` slot once.** A component that renders `<a>` or `<button>` by
  condition puts its slots in one `<ng-template>` and renders it with `ngTemplateOutlet` in both
  branches; slots repeated per `@if` branch project into one branch only. On the consumer side, a
  `@if` wrapping several `[slot=…]` nodes loses the slot (NG8011): one `@if` per node.
- API services have a contract and injection token; app pages depend on the token, not the
  concrete implementation. `app.config.ts` is the composition root.
- **No inline forms in pages.** Button-triggered editing always opens a CDK Dialog
  (`frontend/projects/greenlit/src/app/dialogs/`) or navigates to a screen.
- Use Angular CDK Dialog/Overlay for modal behaviour; don't hand-roll modals.
- Route data drives the shell: `shell` (`app` | `bare`) picks the chrome, `page` is stamped on
  `<body data-page>` and is the e2e anchor for every screen.
- The sheet is the product. Every interaction on it must work with touch on a phone and with the
  keyboard on a desktop; a cell's colour is never the only carrier of its state (text, icon or
  accessible name says it too).

## E2E architecture (Playwright)

- Page Object Model: one page object per screen under `e2e/pages/`, owning the selectors and the
  interactions. Tests state intent; page objects know the DOM. Never put a selector in a test.
- Specs import `test` and `expect` from `e2e/fixtures/gl-test.ts`; routes are keyed in
  `e2e/fixtures/routes.ts` so one spec serves the mocks (`GL_BASELINE=1`) and the app.
- Visual regression (`e2e/tests/visual/`) compares the app to `docs/mocks` region by region.
  Update baselines only for intentional design changes, after changing the mock first.
- Run frontend tests in Chromium only. Do not configure or run Firefox, WebKit, or any other
  browser for frontend testing.

## Incremental Implementation and ATDD - mandatory

Mocks and the design system are design artifacts. ATDD does not apply to their development. Do
not write tests for mocks or the design system.

Every new feature or change to production behavior MUST have a requirement, a detailed design,
and a mock before implementation begins. This includes behavioral changes to existing features,
such as changing how a page behaves. This requirement applies to production-code changes only;
documentation-only, design-system-only, mock-only, and test-only changes are out of scope unless
they are part of implementing a production behavior change.

Every production behavior implementation MUST invoke and follow the `implementing-incrementally`
skill (`.claude/skills/implementing-incrementally` and `.agents/skills/implementing-incrementally`)
before any code is written, combined with acceptance test-driven development (ATDD). Plan small,
reviewable slices, then complete one slice at a time: write Given-When-Then acceptance criteria,
write the acceptance test, and run it to prove it fails for the expected reason BEFORE writing
production code. Implement only what satisfies that slice, refactor with tests green, and run the
relevant regression checks. Do not move to the next slice until those checks pass. No bulk
implementation, no tests added afterward, and no weakening tests to manufacture a pass. Keep the
requirement, detailed design, mock, criteria, tests, and implementation aligned until the entire
feature or behavior change is complete.

Back end: integration tests against the API. Front end: Playwright, using the Page Object Model.

### Never write architecture tests

Never add a test that asserts the shape of the codebase rather than its behavior: no structure,
layout, or naming tests; no banned-API scans; no traceability tests that parse the specifications.
Those constraints belong to the compiler, the formatter, and review. A test suite exists to prove
behavior.
