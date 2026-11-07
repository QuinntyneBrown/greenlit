# ADR-012: The connection state is derived in the browser from events and request outcomes

**Status:** Accepted
**Date:** 2026-11-07

## Context

Journey 26 (Stay informed offline, `L2-045`) shows a banner for five connection states and makes the
calendar read-only while offline. The design left the "unstable" threshold and the "Reconnecting…"
probe open (`<TO SUPPLY>`). The API takes no part in the feature.

## Decision

- **One service, one state.** `ConnectivityService` (contract and `CONNECTIVITY_SERVICE` token in
  `api`) holds a `ConnectionState`: `online`, `offline`, `reconnecting`, `unstable`, `back-online`
  or `sync-failed`, plus the time of the last successful API response.
- **Offline** is the browser's `offline` event. The `online` event moves to **reconnecting** while a
  probe runs: a `no-cors` `HEAD` to the API origin, where any HTTP answer means the API is reachable.
  A reachable API gives **back-online**, which dismisses itself after 5 s; a failed probe gives
  **offline** again. No endpoint is added.
- **Unstable** is one API call that fails with no response (status 0) while the browser says it is
  online. **Sync-failed** is one API call answered 5xx. A later successful call clears either state
  silently. 4xx answers are the page's business and change nothing.
- **Retry** on sync-failed runs the same probe and then asks the open page to load again
  (`reloads` counter); the calendar re-reads its month.
- **Read-only** is `offline` or `reconnecting`: the calendar sheet rows are not editable, the paint
  picker and "Request time off" are disabled.
- The last sync time is shown in the browser's local time as `HH:mm`.

## Consequences

- Cheap and testable with Playwright's offline switch and request interception; no backend change.
- A flaky network that still answers is never called unstable; only failures are counted.
- Offline writes are not queued (out of scope, see the requirement).
