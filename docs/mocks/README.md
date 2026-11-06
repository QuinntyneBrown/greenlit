# Greenlit mocks

Static HTML mocks for Greenlit, the source of truth for the app's look and DOM contract. Each
screen is one file under `pages/`; shared styles live under `styles/`. The Angular components
render exactly the BEM classes, roles and accessible names the mocks use, so one set of e2e
locators serves both the baseline capture (`GL_BASELINE=1`, served on :5173) and the app.

Every screen stamps `<body data-page="<slug>">` and wraps its content in `<main id="main">`.

Breakpoints: **720px** swaps the phone layout for the desktop one.

| Page               | Slug    | Notes                                                                                  |
| ------------------ | ------- | -------------------------------------------------------------------------------------- |
| `pages/sheet.html` | `sheet` | The month view: members down the side, weekday initials and day numbers across the top |

The mocks arrive with their feature, before implementation (see `AGENTS.md`).
