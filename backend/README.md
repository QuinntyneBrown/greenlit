# Greenlit Backend

.NET 10 Clean Architecture backend for Greenlit, the team time-off sheet. See `docs/adr/` for decisions.

## Layout

```
backend/
  Greenlit.sln
  Directory.Build.props          # shared compile settings (net10.0, nullable, warnings-as-errors)
  Directory.Packages.props       # central package management
  global.json                    # pins SDK to 10.0.x
  src/
    Greenlit.Domain/             # entities, enums  (no dependencies)
    Greenlit.Application/        # MediatR handlers, validators, IAppDbContext, DTOs
    Greenlit.Infrastructure/     # AppDbContext, EF configurations + migrations, auth services
    Greenlit.Api/                # Controllers, Program.cs, DI composition
    Greenlit.Cli/                # `greenlit migrate` / `greenlit seed` / `greenlit reset`
                                 # (packaged dotnet tool)
  tests/
    Greenlit.Application.Tests/    # pure unit tests (handlers, validators)
    Greenlit.Infrastructure.Tests/ # persistence on in-memory SQLite
    Greenlit.Api.Tests/            # WebApplicationFactory end-to-end on in-memory SQLite
    Greenlit.Cli.Tests/            # migrate / seed / reset commands
```

## Local quickstart

```powershell
# 1. Restore + build
dotnet build backend/Greenlit.sln

# 2. Apply migrations (set connection string via env var or appsettings)
$env:GREENLIT_CONNECTION = "Server=(localdb)\MSSQLLocalDB;Database=Greenlit;Trusted_Connection=True;TrustServerCertificate=True"
dotnet run --project backend/src/Greenlit.Cli -- migrate

# 3. Seed the demo team (idempotent)
dotnet run --project backend/src/Greenlit.Cli -- seed

# 4. Run the API
dotnet run --project backend/src/Greenlit.Api
```

Swagger UI is served at `/swagger` outside Production.

No SQL Server handy? Run the whole thing on a SQLite file: set `Greenlit__Database__Provider=Sqlite`
and `GREENLIT_CONNECTION="Data Source=.run/greenlit.db"`; the API creates the schema from the
model on startup. `eng/Start-E2eApi.ps1` does exactly this for Playwright.

## Test the whole stack

```powershell
dotnet test backend/Greenlit.sln
```

Four test projects and no database server: the API and Infrastructure tests run on a
per-fixture in-memory SQLite database, the Application and CLI tests on SQLite or EF Core
InMemory. `pwsh eng/Test-Backend.ps1` runs the suite as CI does.

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/_ping` | Pipeline smoke endpoint (used by tests) |

The sheet, team and request endpoints land feature by feature; each one starts from a
requirement in `docs/specs/`, a detailed design and a mock (see `AGENTS.md`).
