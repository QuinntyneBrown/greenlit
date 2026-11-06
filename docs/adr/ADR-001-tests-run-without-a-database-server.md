# ADR-001: Tests run without a database server

**Status:** Accepted
**Date:** 2026-11-06

## Context

The reference project this repository is modelled on started its API tests on SQL Server LocalDB
and paid for it in CI runners, flaky named pipes and a Windows-only suite. Greenlit's data model
is small and relational; nothing in it needs SQL Server-specific behaviour to be proven.

## Decision

- Production and development run on SQL Server with explicit EF Core migrations
  (`greenlit migrate`).
- `Greenlit:Database:Provider=Sqlite` switches the API and the CLI to SQLite. SQLite has no
  migrations: the API creates the schema from the model on startup (`EnsureSqliteSchemaAsync`),
  and refuses to run that way in Production.
- API tests boot the API in-process against a per-fixture, uniquely named in-memory SQLite
  database held open by a keep-alive connection. Infrastructure tests use an in-memory SQLite
  connection per fixture. Application and CLI tests use SQLite or EF Core InMemory.
- `eng/Start-E2eApi.ps1` starts the API for Playwright on a fresh SQLite file and seeds the demo
  team with the CLI.

## Consequences

- The whole suite runs on Linux in CI and on any laptop with the .NET SDK; no LocalDB.
- SQL Server-only behaviour (if any lands) needs an opt-in test category and a server; add it
  behind a `[Trait("Category", "SqlServer")]` and skip it unless a connection string is set.
- The EF model must stay provider-neutral: no SQL Server-only column types or default SQL.
