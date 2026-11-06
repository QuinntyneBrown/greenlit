# Contributing to Greenlit

Thank you for your interest in improving Greenlit. This project is a team time-off sheet with a
.NET backend, Angular frontend, Playwright test suite, and static mock reference application.

## Before You Start

- Read `AGENTS.md`. It is the single source of guidance for working in this repository.
- Check existing issues and pull requests to avoid duplicate work.
- Open an issue first for user-visible behavior changes, larger refactors, or changes that affect
  API contracts.
- Keep pull requests focused on one fix, feature, or documentation update.
- Include screenshots or Playwright evidence for visible UI changes.

## Development Setup

```powershell
cd frontend
npm ci

cd ..\e2e
npm ci
npx playwright install chromium

cd ..\backend
dotnet restore .\Greenlit.sln
```

`pwsh eng/Start-FreshStack.ps1` resets and seeds the database, then starts the API and the
Angular dev server.

## Project Layout

| Path                     | Purpose                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| `backend/`               | .NET solution, Clean Architecture layers, EF Core, API, CLI, tests               |
| `frontend/`              | Angular app plus `api` and `components` libraries                                |
| `e2e/`                   | Playwright behavior and visual tests                                             |
| `docs/mocks/`            | Static HTML/CSS design, the source of truth for the app and the visual baselines |
| `docs/specs/`            | L1 and L2 requirements                                                           |
| `docs/detailed-designs/` | Per-feature designs                                                              |
| `docs/adr/`              | Architecture decision records                                                    |
| `eng/`                   | Local engineering automation scripts                                             |

## Coding Guidelines

- Every production behavior change starts from a requirement, a detailed design and a mock, and
  is built one acceptance-tested slice at a time (`AGENTS.md`).
- Follow existing patterns in the layer you are changing.
- Keep backend business rules in application handlers and domain services, not controllers.
- Keep EF migrations explicit. The API must not apply migrations on startup.
- Keep seed data idempotent and safe to rerun.
- Keep Angular component hosts and inner elements on the mocks' BEM class names; the e2e page
  objects locate by them.
- Keep visual changes consistent with `docs/mocks/` unless the pull request is intentionally
  updating the design. Then change the mock first and re-capture baselines (`npm run baseline`
  in `e2e/`).
- Frontend code is formatted with Prettier and linted with angular-eslint. The husky pre-commit
  hook (installed by `npm ci` in `frontend/`) fixes staged files automatically; run
  `npm run lint` and `npm run format:check` before opening a pull request.
- Avoid unrelated formatting churn and broad refactors in feature or bug-fix pull requests.

## Tests

Run the checks that match your change. For cross-stack changes, run all of them.

```powershell
# Backend build and tests
dotnet build .\backend\Greenlit.sln
dotnet test .\backend\Greenlit.sln

# Frontend build and tests
cd frontend
npm run build -- greenlit --configuration development
npm run build -- components
npm run build -- api
npm test -- --watch=false

# Playwright behavior and visual tests (API from eng/Start-E2eApi.ps1)
cd ..\e2e
npm run test:behavior
npm run test:visual
```

## Pull Request Checklist

- The change has a clear issue, rationale, or user-facing reason.
- New or changed behavior has test coverage appropriate to the risk.
- Relevant documentation is updated.
- UI changes include screenshots or Playwright evidence.
- Database changes include explicit EF migrations and seed updates if needed.
- The pull request description lists the commands you ran.

## Reporting Bugs

When filing a bug, include:

- the route or command where the problem appears;
- expected behavior;
- actual behavior;
- reproduction steps;
- logs, screenshots, or terminal output;
- operating system, browser, and relevant tool versions.
