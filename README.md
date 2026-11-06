<p align="center">
  <img src="docs/assets/greenlit-icon-green.svg" alt="Greenlit logo" width="96" height="96">
</p>

<h1 align="center">Greenlit</h1>

<p align="center">
  <strong>Team time off, one month at a time.</strong><br>
  The vacation sheet small teams keep in Google Sheets, as a product: members down
  the side, days across the top, a colour in every cell, and the manager's
  green light where it counts.
</p>

Managers of small teams still track vacation in a Google Sheet: one table per month, names down
the side, weekday initials and day numbers across the top, and a colour in every cell. Red for
weekends and holidays, blue for tentative, yellow for requested, green for confirmed.

Greenlit is that sheet as a product. A responsive web app where a team member colours their own
days, the manager confirms them, and everyone sees the same month. Nothing more.

## Stack

| Path        | What                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `backend/`  | .NET 10 Clean Architecture API, EF Core (SQL Server; SQLite for tests and e2e), MediatR, JWT, `greenlit` CLI                   |
| `frontend/` | Angular 21 workspace: `greenlit` app, `api` library (contracts + implementations), `components` library (`gl-*` design system) |
| `e2e/`      | Playwright (Chromium only), Page Object Model, visual parity against `docs/mocks`                                              |
| `docs/`     | Requirements (`specs/`), detailed designs, mocks, ADRs                                                                         |
| `eng/`      | PowerShell scripts for local runs and CI                                                                                       |

`AGENTS.md` is the single source of guidance for anyone (or any agent) working in this repository.

## Quick start

```powershell
# Backend: build and test (no database server needed)
dotnet build backend/Greenlit.sln
dotnet test backend/Greenlit.sln

# Frontend
cd frontend
npm ci
npm start                    # http://localhost:4200, expects the API on :5100

# API on a fresh SQLite file with the demo team, for Playwright or local hacking
pwsh eng/Start-E2eApi.ps1 -Build

# Playwright
cd e2e
npm ci
npx playwright install chromium
npm run test:behavior
```

`pwsh eng/Start-FreshStack.ps1` resets and seeds the database (SQL Server LocalDB, or `-Sqlite`),
then starts both the API and the dev server.

## Status

Scaffold. The request pipeline, persistence, CLI, shell, lint/format gates and the e2e harness
are in place and green. The sheet itself lands feature by feature, each from a requirement in
`docs/specs/`, a detailed design and a mock, following the process in `AGENTS.md`.
