# ADR-002: API tests run sequentially

**Status:** Accepted
**Date:** 2026-11-06

## Context

Each API test class boots a `WebApplicationFactory<Program>`. Several hosts starting in one
process at once contend for Serilog's static logger and for ports, and interleave their request
logs so a failure is hard to read.

## Decision

`backend/tests/Greenlit.Api.Tests/xunit.runner.json` turns off assembly and collection
parallelism. The host configures its own logger with `preserveStaticLogger: true` so one host
shutting down never closes another's sink. `eng/Test-Backend.ps1` still runs the four test
assemblies side by side as separate processes; serialization applies only within the API
assembly.

## Consequences

- API tests are slower than they could be; keep the fixtures cheap and share one per class.
- Tests of other assemblies may stay parallel.
