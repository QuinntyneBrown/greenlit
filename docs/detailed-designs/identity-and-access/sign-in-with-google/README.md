# Sign in with Google

## Overview

Greenlit signs people in with an email and a password (`identity-and-access/sign-in`) and turns an invitation into an account with a name and a password (`identity-and-access/accept-invitation`). Many small teams already live in Google Workspace, and a manager who wants to try Greenlit has had no way in at all: manager accounts came from the operator.

This feature adds Google as a second way in on both pages. "Continue with Google" on the sign-in page signs an existing person in, or creates a manager account for a newcomer who then sets up a team. "Join with Google" on the accept-invitation page joins the team with the Google account that carries the invited address. Google tells Greenlit who the person is; Greenlit still issues its own session (ADR-004) and keeps every rule about teams, members and roles.

**Google account** — the identity Google vouches for: a stable subject, an email address, whether Google has verified that address, and a display name

**access token** — the short-lived credential Google Identity Services hands the browser after the person chooses an account; Greenlit sends it to the API once and never stores it

**linked account** — a Greenlit `User` whose `GoogleSubject` is set, so later Google sign-ins find it by subject rather than by email

## Description

The feature is a vertical slice from the Greenlit web application through the Greenlit API to the Greenlit database, with Google as the one external system.

**Frontend**

- **`GoogleButton`** — `gl-google-button` in `components`: the design system's default (outlined) button, full width, with the label `Continue with Google` or `Join with Google`. It takes `busy` and `disabled` like `gl-button`. Google's four-colour "G" mark leads the label as an inline `.icon` SVG (20 px, `aria-hidden`; the label names the provider). It keeps Google's own colours, the one place a component draws hex values, since a brand mark is not themed.
- **`AuthDivider`** — `gl-auth-divider` in `components`: the "or" rule between the two ways in (`.auth-divider` in the design system).
- **`GoogleIdentity / GOOGLE_IDENTITY`** — Contract and injection token in the `api` project: `requestAccessToken(): Observable<GoogleTokenResult>`, which answers `{ outcome: 'token', accessToken }`, `{ outcome: 'dismissed' }` when the person closes Google's window, or `{ outcome: 'failed' }`. `GisGoogleIdentity` loads `https://accounts.google.com/gsi/client` once, creates a token client with the client ID from `GOOGLE_CLIENT_ID` and the scopes `openid email profile`, and opens Google's popup.
- **`AuthService / AUTH_SERVICE`** — Gains `signInWithGoogle(accessToken)`, which posts to `POST /api/auth/google`, stores the session and answers `signed-in` (with `newAccount` true when the API created one), `unverified` or `failed`.
- **`InvitationService / INVITATION_SERVICE`** — Gains `acceptWithGoogle(token, accessToken)`, which posts to `POST /api/invitations/{token}/accept-google` and answers `joined`, `mismatch`, `exists`, `expired` or `failed`.
- **`SignInPage`** — Adds the divider, the Google button and the states of `pages/sign-in/google-*`: busy while Google and the API answer, the two Google alerts, and the "Account created" panel that opens create-team.
- **`AcceptInvitePage`** — Adds the Google button above the form and the states of `pages/accept-invite/google-*`.

**Backend**

- **`AuthController`** — `POST /api/auth/google`, `[AllowAnonymous]` like sign-in: it is how a session starts.
- **`InvitationsController`** — `POST /api/invitations/{token}/accept-google`, anonymous like the rest of the controller.
- **`SignInWithGoogleCommand / SignInWithGoogleCommandHandler`** — Reads the Google account through `IGoogleAccounts`, refuses an unverified email, then finds the `User` by `GoogleSubject`, else by email (linking the subject), else creates a manager `User` with no password. Applies the removed-member rule and issues the session.
- **`AcceptInvitationWithGoogleCommand / AcceptInvitationWithGoogleCommandHandler`** — Finds the open invitation (`InvitationLookup`), reads the Google account, requires its verified email to equal the invitation's email, and otherwise does what `AcceptInvitationCommandHandler` does: claims the invitation, creates the `User` (with `GoogleSubject`, no password, Google's name), links the row and issues the session.
- **`IGoogleAccounts`** — Greenlit.Application abstraction: `ReadAsync(accessToken)` returns a `GoogleAccount` (`Subject`, `Email`, `EmailVerified`, `Name`) or null when the token is not one of ours or Google rejects it.
- **`GoogleAccounts`** — Greenlit.Infrastructure implementation over `HttpClient`: `tokeninfo` for `aud`, `sub`, `email` and `email_verified`, `userinfo` for `name`. `FakeGoogleAccounts` decodes `fake-google.<base64url JSON>` tokens for tests and the e2e API and is refused in Production.
- **`GoogleOptions`** — `Greenlit:Google:ClientId` (or `GREENLIT_GOOGLE_CLIENT_ID`) and `Greenlit:Google:Accounts` (`Google`, the default, or `Fake`).
- **`User`** — Existing entity; gains `GoogleSubject` (`string?`, unique when set). `PasswordHash` stays required in the schema and is empty for a Google-only account.

**Shared plumbing (exists today)**

- **`ExceptionHandlingMiddleware`** — Greenlit.Api middleware. It maps application exceptions (`ValidationException`, `UnauthorizedException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `GoneException`, `BadRequestException`) to ProblemDetails responses with a `code` extension.
- **`ValidationBehavior`** — MediatR pipeline behaviour in Greenlit.Application. It runs each request's FluentValidation validator before the handler and raises `ValidationException` on failure.
- **`IAppDbContext`** — Greenlit.Application abstraction over the EF Core context, implemented by `AppDbContext` in Greenlit.Infrastructure. Handlers read and write through it in one unit of work.
- **`ITokenService`** — Issues the eight-hour JWT (ADR-004); unchanged.
- **`RemovedMembers`** — The rule that a removed member's sign-in is refused; unchanged and applied here too.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-051` | `L1-001` | **Continue with Google.** A person signs in, or starts a manager account, with their Google account instead of a password. |
| `L2-052` | `L1-001` | **Join with Google.** An invited person joins the team with their Google account instead of choosing a password. |

## Diagrams

### System context

A visitor signs in to Greenlit with a Google account. Google Identity is the one external system: it shows the account chooser and vouches for the account.

![C4 system context for sign in with Google](diagrams/c4-context.png)

### Containers

The page asks Google Identity Services for an access token and posts it to the Greenlit API, which checks it with Google's token endpoints before reading or writing users.

![C4 container view for sign in with Google](diagrams/c4-container.png)

### Components

`GoogleIdentity` owns the GIS script and the popup; the two pages pass the token to their service, whose controller sends the matching command. Both handlers read the account through `IGoogleAccounts` and issue the session through `ITokenService`.

![C4 component view for sign in with Google](diagrams/c4-component.png)

### Class structure

`User` gains `GoogleSubject`. The two handlers depend on `IGoogleAccounts`, implemented by `GoogleAccounts` (Google) and `FakeGoogleAccounts` (tests), and on `ITokenService`.

![Class diagram for sign in with Google](diagrams/class-structure.png)

### Behaviour — continue with Google

A dismissed popup changes nothing (`L2-051` AC2). The handler finds the account by subject, links it by email, or creates a manager account (`L2-051` AC3, AC4); an unverified email is refused (`L2-051` AC5).

![Sequence diagram: continue with Google](diagrams/sequence-sign-in.png)

### Behaviour — join with Google

The Google email must be the invited address (`L2-052` AC4, AC5); otherwise the join does what a password join does (`L2-052` AC3).

![Sequence diagram: join with Google](diagrams/sequence-join.png)

## Decisions (journey 26, 7 Nov 2026)

| Topic | Decision |
|---|---|
| Google flow | GIS OAuth 2.0 token client with a button of our own (ADR-012). The ID-token "Sign in with Google" button is rendered by Google in an iframe, cannot take the design system's styling and cannot be driven by the Playwright suite; the token client can start from any button. Scopes `openid email profile`; the popup's `prompt` is `select_account` so a person with several Google accounts always chooses. |
| Client ID | Public, compiled in: `environment.googleClientId` (`frontend/projects/greenlit/src/environments`) provided as `GOOGLE_CLIENT_ID`, and `Greenlit:Google:ClientId` / `GREENLIT_GOOGLE_CLIENT_ID` on the API, which must be the same value or every token fails the audience check. The OAuth client lives in the Google Cloud project `greenlit-514017`; `README.md` says how to set it up. |
| Endpoints | `POST /api/auth/google` with `{ accessToken }` answers `200 SessionDto` plus `newAccount: true` when it created the account. `POST /api/invitations/{token}/accept-google` with `{ accessToken }` answers `200 SessionDto`. Both are anonymous by design. |
| Error codes | `401 google_token_invalid` (Google rejected the token, or it was issued to another client); `401 google_email_unverified`; the removed-member refusal as for password sign-in. On the invitation: `409 google_email_mismatch`, `409 google_email_unverified` (both shown under the same alert title with their own sentence), `409 account_exists`, `410 invitation_expired`, `404 invitation_not_found`. An empty `accessToken` is a `400` validation error with "Enter a Google access token." — the page never sends one. |
| Matching | Subject first, then email, then create. Emails compare trimmed and case-insensitively, as sign-in does. Linking by email writes `GoogleSubject` on the existing account; a later change of Greenlit email keeps the link (`L2-051` AC3). A subject already linked to another account cannot collide with an email match because the subject lookup runs first and subjects are unique. |
| New manager account | `Role = Manager`, `DisplayName` from Google's name (the email's local part when Google gives none), `PasswordHash` empty, no team: the app's existing rule sends an account without a team to create-team (`L2-008` AC8). The response's `newAccount` lets the page show "Account created" rather than "Welcome back". |
| No password | A Google-only account's `PasswordHash` is the empty string; `SignInCommandHandler` treats an empty hash as a mismatch before hashing, so it costs the same as an unknown email. The reset-password journey sets a password for such an account like any other. The account page's "Update password" is out of scope here (it asks for the current password; a later journey decides). |
| Join with Google | Name comes from Google, not the form: the form's "Your name" is for the password path and stays untouched. The email rule is strict equality with the invitation's email (case-insensitive): an invitation vouches for one address, and Google must vouch for the same one. |
| Busy state | While Google's popup is open and while the API answers, the Google button is busy (`aria-busy`, disabled) and the password form's fields and submit are read-only/disabled, as `pages/sign-in/google-busy` and `pages/accept-invite/google-busy` show, so the person cannot start two sign-ins. |
| Dismissed popup | GIS reports `popup_closed` through `error_callback`; the page returns to its previous state with no alert (`L2-051` AC2, `L2-052` AC2). `access_denied` (the person refused the consent) is treated the same way. |
| Testing | `Greenlit:Google:Accounts=Fake` on the API tests and on the e2e API (`eng/Start-E2eApi.ps1`). The Playwright `SignInPage` and `AcceptInvitePage` page objects route `https://accounts.google.com/gsi/client` to a stub that implements `google.accounts.oauth2.initTokenClient` and answers with a `fake-google.` token for the account the test chose (or `popup_closed`). No Google account, no network. |
| Seed | Unchanged. The e2e sign-up cases use a fresh address per viewport (`rosa+mobile@`, `rosa+tablet@`, `rosa+desktop@northwind.studio`) so each run starts from a database where it has no account. |
| Visual baselines | The sign-in and accept-invite default mocks change (divider and button), so their visual baselines need re-capturing from the mocks (`npm run baseline`) by whoever next runs the visual suite on the baseline platform. |

## Security and privacy

- **What the API trusts.** Only what Google says about the token: `tokeninfo` must name our client ID as `aud` or `azp` and the token must still be valid; anything else is `google_token_invalid`. The browser's own claims about who the person is are never sent or used.
- **Verified emails only.** An email Google has not verified never matches, links or creates an account, on either page, because matching by email is the whole security of linking.
- **What an error reveals.** `google_email_unverified` and `google_email_mismatch` reveal nothing about which emails have Greenlit accounts; `account_exists` on the invitation already does (`L2-004` AC8) and is unchanged.
- **Tokens.** The Google access token is sent once over HTTPS, used for two calls to Google and discarded; it is never logged (the logging behaviour logs request type names only) or stored. Greenlit stores the Google subject, email and name, nothing else from Google.
- **Team scoping.** Unchanged: the session names the caller's own team and row, and handlers resolve the team from `sub`.
- **Fake accounts.** `FakeGoogleAccounts` is refused when the environment is Production, so a misconfiguration cannot let anyone mint accounts with a hand-made token.
