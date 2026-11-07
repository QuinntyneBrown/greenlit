# ADR-004: A session is one eight-hour bearer token kept in the browser

**Status:** Accepted
**Date:** 2026-11-07

## Context

Sign-in (journey 2) issues the session the rest of the app depends on. The API already
validates JWT bearer tokens (`JwtOptions`, a fallback policy that requires one), and the `api`
library already keeps a token in `localStorage` and sends it from an interceptor. The open
question was how long a session lasts and whether it needs a refresh token. Greenlit is used by
small teams during the working day, has no self sign-up and holds no payment or health data.

## Decision

- Sign-in returns one signed JWT (HS256, `GREENLIT_JWT_SIGNING_KEY`) with the claims `sub`,
  `role` and, when the user has a row on a team, `team_id` and `team_member_id`.
- The token lasts eight hours (`Greenlit:Jwt:AccessTokenMinutes` = 480). There is no refresh
  token and no server-side session store; when the token expires the person signs in again
  (L2-007, journey 20).
- The browser keeps the token in `localStorage` (`greenlit.session`) through the `SESSION_STORE`
  contract, so a reload or a second tab stays signed in. The interceptor sends it to the
  Greenlit API origin only.

## Consequences

- No refresh endpoint, cookie, CSRF protection or token table to build or test.
- A stolen token is usable until it expires. Keep the lifetime short, keep XSS out (Angular's
  sanitisation, no `innerHTML` of user content), and revisit with a revocation list if sign-out
  must end sessions on other devices.
- Handlers keep resolving the caller's team from `sub`, so a token outliving a membership change
  never widens access.
