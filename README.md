<p align="center">
  <img src="docs/assets/greenlit-icon-green.svg" alt="Greenlit logo" width="96" height="96">
</p>

<h1 align="center">Greenlit</h1>

<p align="center">
  <strong>Team time off, one month at a time.</strong>
</p>

<p align="center">
  <a href="https://github.com/QuinntyneBrown/greenlit/actions/workflows/ci.yml"><img src="https://github.com/QuinntyneBrown/greenlit/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/QuinntyneBrown/greenlit/actions/workflows/deploy.yml"><img src="https://github.com/QuinntyneBrown/greenlit/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT"></a>
</p>

Greenlit replaces the vacation spreadsheet that managers of small teams keep by hand. It is a
responsive web app with one table per month: team members down the side, days across the top,
and a colour in every cell. A member colours their own days, the manager confirms them, and
everyone sees the same month.

| Colour | Meaning                                       |
| ------ | --------------------------------------------- |
| Red    | Weekend or team holiday                       |
| Blue   | Tentative: pencilled in, not yet requested    |
| Yellow | Requested: waiting on the manager             |
| Green  | Confirmed: the manager gave it the green light |

## Table of contents

- [Features](#features)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Running the tests](#running-the-tests)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security](#security)
- [Support](#support)
- [License](#license)

## Features

- **Month sheet.** The team's month at a glance, with an Out row and month navigation.
- **Mark days.** Pick a colour and press or drag across your row, on a phone or with a keyboard.
- **Requests.** Send a request with a note; the manager approves or declines, singly or in bulk,
  with Undo.
- **Allowances.** Yearly days per member, adjustments, and a Left column that never blocks.
- **Holidays.** Public holidays for GB, IE and US on team creation, plus the team's own.
- **Teams and invitations.** Create a team, invite members by email, accept with a link.
- **Sign-in and password reset.** Eight-hour sessions with email-based password recovery.

Greenlit is under active development. See [docs/estimates](docs/estimates/README.md) for the
current percentage complete and the roadmap.

## Project structure

| Path                     | Description                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `backend/`               | .NET 10 API (Clean Architecture, EF Core, MediatR, JWT) and the `greenlit` CLI                        |
| `frontend/`              | Angular 21 workspace: `greenlit` (app), `marketing` (site), `api` (contracts), `components` (`gl-*`) |
| `e2e/`                   | Playwright suite (Chromium only) with page objects and visual parity against the mocks               |
| `docs/specs/`            | Requirements: `L1.md` (high level) and `L2.md` (detailed, with acceptance criteria)                   |
| `docs/detailed-designs/` | Per-feature designs with C4, class and sequence diagrams                                             |
| `docs/mocks/`            | Static HTML design reference, the source of truth for the UI                                         |
| `docs/adr/`              | Architecture decision records                                                                        |
| `eng/`                   | PowerShell scripts for local runs and CI                                                             |

`AGENTS.md` is the single source of engineering guidance for this repository, for people and
agents alike.

## Getting started

### Prerequisites

- [.NET SDK 10.0](https://dotnet.microsoft.com/download) (see `backend/global.json`)
- [Node.js 22](https://nodejs.org/) and npm
- [PowerShell 7](https://github.com/PowerShell/PowerShell) for the scripts in `eng/`
- SQL Server LocalDB is optional; tests and the e2e API use SQLite

### Build

```powershell
dotnet build backend/Greenlit.sln

cd frontend
npm ci
npm run build
```

### Run

The quickest way to see the product is the seeded demo team on SQLite:

```powershell
pwsh eng/Start-E2eApi.ps1 -Build      # API on http://localhost:5100

cd frontend
npm start                             # app on http://localhost:4200
npm run start:marketing               # marketing site on http://localhost:4300
```

Sign in as `maya@northwind.studio` with the password `greenlit-demo` to act as the manager, or as
`noor@northwind.studio` to walk through creating a team.

To run against SQL Server LocalDB instead, `pwsh eng/Start-FreshStack.ps1` resets and seeds the
database and then starts both the API and the dev server. Pass `-Sqlite` to use SQLite.

The API does not apply migrations on startup. Use the CLI:

```powershell
dotnet run --project backend/src/Greenlit.Cli -- migrate
dotnet run --project backend/src/Greenlit.Cli -- seed
dotnet run --project backend/src/Greenlit.Cli -- reset --yes
```

## Running the tests

No database server is required. Backend tests run on in-memory SQLite; Playwright runs against
the API started by `eng/Start-E2eApi.ps1`.

```powershell
# Backend, as CI runs it
pwsh eng/Test-Backend.ps1

# Frontend: format, lint, unit tests
cd frontend
npm run format:check
npm run lint
npm test

# End to end
cd e2e
npm ci
npx playwright install chromium
npm run test:behavior                 # behaviour
npm run test:visual                   # visual parity with docs/mocks
```

## Documentation

- [User journeys](docs/journeys.md): the scenarios the product serves, in priority order
- [Requirements](docs/specs/): L1 and L2 with acceptance criteria
- [Detailed designs](docs/detailed-designs/): one per feature, derived from the requirements
- [Design system](docs/design-system/): tokens, foundations and components extracted from the mocks
- [Architecture decisions](docs/adr/): the ADRs behind the backend, auth, holidays and deployment
- [Estimates](docs/estimates/README.md): effort, percentage complete and roadmap
- [Business plan](docs/business-plan.md)

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and `AGENTS.md` before you
start: every production change begins with a requirement, a detailed design and a mock, and
lands in small, test-first slices. Changes to `main` go through a pull request.

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

To report a vulnerability, follow the process in [SECURITY.md](SECURITY.md). Please do not open
a public issue for security problems.

## Support

See [SUPPORT.md](SUPPORT.md) for how to ask questions and file bugs.

## License

Greenlit is licensed under the [MIT License](LICENSE).
