# ADR-011: Host the API on a Free Linux App Service with a Basic Azure SQL database

## Status

Accepted (2026-11-07)

## Context

The app site of ADR-010 needs an API. Greenlit serves one or two users for now, so the hosting bill
matters more than headroom, and `Program.cs` refuses SQLite in Production: the API runs on SQL Server.

## Decision

- **App Service** `app-greenlit-api-prod` on the Linux plan `asp-greenlit-prod`, tier **F1 (Free)**, runtime
  `DOTNETCORE|10.0`, HTTPS only, in Canada Central. The Free tier sleeps between requests, has no
  always-on and no custom domain, and allows sixty CPU-minutes a day: enough for a small team.
- **Azure SQL** `sql-greenlit-cc-prod` / database `greenlit`, **Basic** (5 DTU, 2 GB, about US$5 a month),
  the cheapest deterministic SQL Server. East US 2 refused new SQL servers, which is why the API and
  the database sit in Canada Central while the static sites sit in East US 2.
- Configuration is App Service application settings, never files: `Greenlit__Database__Provider=SqlServer`,
  `GREENLIT_CONNECTION`, `GREENLIT_JWT_SIGNING_KEY`, `Greenlit__App__Origin` and `Cors__AllowedOrigins__0`
  (the app site's address, later `https://app.greenlit.rocks`), `ASPNETCORE_ENVIRONMENT=Production`.
- `deploy.yml` publishes the API framework-dependent, opens the SQL firewall to the runner for the length of
  the job, runs `greenlit migrate --provider SqlServer` (the API never migrates on startup), closes the
  firewall, zip-deploys, and smoke-tests the anonymous `POST /api/_ping` (`{"mode":"ok"}` → 200) (Swagger is not mounted in Production).
- The runner signs in as the service principal `sp-greenlit-github-deploy`, Contributor on `rg-greenlit-prod`
  only (`AZURE_CREDENTIALS`).

## Consequences

- First request after idle takes a few seconds (cold start); acceptable at this size. Moving to B1
  (`az appservice plan update --sku B1`) buys always-on and a custom domain when needed.
- Invitation emails are logged, not sent (ADR-006); the first manager account comes from running
  `greenlit seed` against the production database by hand, or from a later bootstrap command.
- The database admin password lives only in the connection string secret and the web app setting; rotate
  it with `az sql server update --admin-password` and update both.
