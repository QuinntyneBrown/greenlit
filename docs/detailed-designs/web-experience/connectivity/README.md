# Handle connection changes

## Overview

Greenlit keeps showing what it last loaded when the connection drops, and stops anything that would change data. A banner at the top of the page says what is happening: offline, reconnecting, unstable, back online, or unable to sync the latest changes.

While offline the calendar is read-only: painting and selecting are disabled until the connection returns. If a page has nothing loaded to show, the offline page replaces it.

**connection state** — one of online, offline, reconnecting, unstable or sync-failed, held by the web application

**last sync** — time of the last successful load, shown as "You’re looking at the calendar as of 10:42."

## Description

The feature is a vertical slice from the Greenlit web application to the Greenlit database.

**Frontend**

- **`ConnectivityService`** — Angular service that combines the browser `online`/`offline` events with the outcome of API calls into a `ConnectionState` signal. The thresholds for "unstable" and the probe for "Reconnecting…" are `<TO SUPPLY>`.
- **`ConnectionBanner`** — `gl-alert` banner in the app shell. Offline has no dismiss button; back online dismisses itself after 5 s; sync-failed offers "Retry" and the last sync time.
- **`Read-only guard`** — `CalendarPage` and the editing directives read `ConnectionState` and disable `PaintController` and `SelectionController` while offline (`L2-045` AC1).
- **`OfflinePage`** — Full-page state used when there is no cached data (`web-experience/error-pages`).

**Backend**

- **`Greenlit API`** — The API takes no part; a failed request is the signal.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-045` | `L1-012` | **Connection banners.** A banner reports the connection state; while offline the calendar is read-only. |

## Diagrams

### System context

A team user keeps reading Greenlit while the connection is down.

![C4 system context for handle connection changes](diagrams/c4-context.png)

### Containers

The connection state lives in the Greenlit web application, derived from browser events and API call outcomes.

![C4 container view for handle connection changes](diagrams/c4-container.png)

### Components

`ConnectivityService` drives both the banner and the read-only guard on the calendar.

![C4 component view for handle connection changes](diagrams/c4-component.png)

### Class structure

`ConnectionState` has one value per banner in the mocks.

![Class diagram for handle connection changes](diagrams/class-structure.png)

### Behaviour — go offline and come back

Offline has no dismiss button and disables editing (`L2-045` AC1); back online leaves after 5 s (`L2-045` AC3).

![Sequence diagram: go offline and come back](diagrams/sequence-offline-and-back.png)
