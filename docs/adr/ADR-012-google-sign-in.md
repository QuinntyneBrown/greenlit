# ADR-012: Google sign-in exchanges a Google access token for the Greenlit session

**Status:** Accepted
**Date:** 2026-11-07

## Context

Journey 26 adds "Continue with Google" to sign-in (L2-051) and "Join with Google" to accepting an
invitation (L2-052). Greenlit's session is one eight-hour bearer JWT issued by the API (ADR-004),
and every page depends on it; Google sign-in has to end in that same token. The open questions
were which Google flow to use, how the API checks what Google says, how a Google account maps on
to a Greenlit account, and how the API tests and the Playwright suite run without Google.

Greenlit is invite-only for members. Until now the only way to get a manager account was the
operator (the demo seed). With Google a person can start a manager account themselves, so the
sign-in page stops saying "invite-only" outright and says where a newcomer can go instead.

## Decision

- **Flow.** The browser uses Google Identity Services' OAuth 2.0 token client
  (`google.accounts.oauth2.initTokenClient`, popup, scopes `openid email profile`). It is the one
  GIS flow a button of our own can start, so the button keeps the design system's look and the
  mocks stay the source of truth. The client ID is public and compiled into the Angular
  environment (`googleClientId`); there is no client secret anywhere in Greenlit.
- **Verification.** The browser posts the access token to the API, which asks Google two things
  before it trusts it: `GET https://oauth2.googleapis.com/tokeninfo?access_token=…` for the token's
  audience (`aud`/`azp` must be our client ID), subject, email and `email_verified`; and
  `GET https://www.googleapis.com/oauth2/v3/userinfo` for the name. `IGoogleAccounts` in
  Greenlit.Application hides this; `GoogleAccounts` in Greenlit.Infrastructure implements it with
  `HttpClient` and the client ID from `Greenlit:Google:ClientId` / `GREENLIT_GOOGLE_CLIENT_ID`. No
  new NuGet package: there is nothing to cache, and the tokens are opaque, so an id-token
  verifier would add a dependency for no gain.
- **Mapping.** `User` gains a nullable, unique `GoogleSubject`. Sign-in with Google first looks for
  the subject; failing that, for an account with the Google email, which it then links by storing
  the subject; failing that, it creates a manager account (`Role = Manager`, no password, the
  name Google gives) that lands on create-team like any account without a team (L2-008 AC8).
  An unverified Google email never matches or creates anything (`google_email_unverified`).
  Joining with Google requires the Google email to equal the invitation's email
  (`google_email_mismatch`), and otherwise does what accepting with a password does.
- **No password.** A Google-only account keeps an empty `PasswordHash`. Password sign-in treats an
  empty hash as a mismatch (the design already said so); "Forgot your password?" still lets the
  person set one, after which both ways in work.
- **Tests.** `Greenlit:Google:Accounts=Fake` registers `FakeGoogleAccounts`, which decodes tokens
  of the form `fake-google.<base64url JSON>` (`sub`, `email`, `email_verified`, `name`) and is
  refused in Production, the way SQLite is. The API tests and `eng/Start-E2eApi.ps1` use it; the
  Playwright page objects serve a stub in place of `https://accounts.google.com/gsi/client` whose
  token client calls back with such a token, so the suite drives the real pages and the real API
  with no Google account.

## Consequences

- Sign-in with Google costs two calls to Google per attempt; sign-in with a password costs none.
  Google's rate limits are far above what a team of ten produces.
- The Google Cloud project `greenlit-514017` holds the OAuth client (`Greenlit web`, JavaScript
  origins `http://localhost`, `http://localhost:4200`, `https://app.greenlit.rocks`). The app is in
  Google's *Testing* publishing status until it is published: only the test users listed on its
  consent screen can continue with Google. Publishing it is an operator task, not code.
- Changing a Greenlit email no longer breaks Google sign-in once the subject is linked; changing
  the Google email does not change the Greenlit email.
- Managers can now create their own accounts, so a spam sign-up creates a user row and nothing
  else; a team still needs the create-team form. Revisit with a domain allow-list if that becomes
  a problem.
