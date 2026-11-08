# Branded email

## Overview

Greenlit emails people at the moments that matter: an invitation to join a team, a password reset link, a request for the manager to decide, and the decision for the member. Until now those emails were plain text and never left the application log (ADR-006). This feature sends them for real, from Greenlit's own address, as HTML emails in Greenlit's visual language, each with a plain-text twin.

**branded email** — an HTML email rendered by `EmailLayout` with the Greenlit lockup, a heading, the message, one button and the footer, styled inline with values from the design tokens

**plain-text twin** — the same message as text, carrying the same links; what the log sender writes and what the Playwright suite reads

**sender domain** — `mail.greenlit.rocks`, verified with Azure (TXT, SPF, two DKIM CNAMEs at Namecheap); the From address is `Greenlit <no-reply@mail.greenlit.rocks>`

## Description

The feature is a slice of the Greenlit API from the handlers that decide to email someone to the mail service, with no frontend part: the app's pages and toasts already say when an email was or was not sent.

**Backend**

- **`EmailMessage`** — Greenlit.Application record, now `(To, Subject, Body, Html)`: `Body` is the plain text, `Html` the branded part. Both say the same thing and carry the same links.
- **`EmailLayout`** — Greenlit.Application. `Render(heading, bodyHtml, buttonLabel, buttonHref, note, preheader, appOrigin)` returns the whole HTML document: the lockup drawn with table cells (mail clients drop SVG), the heading, the body, the button, the muted note and the footer "Greenlit · the vacation sheet your team already keeps" linking to the app. `Paragraph`, `Quote` (a note or reason) and `Status` (a coloured mark with its label) are the pieces the composers use. Every value is inline, taken from `docs/design-system/tokens/tokens.css` (light theme), because mail clients ignore stylesheets.
- **`InvitationEmail`, `PasswordResetEmail`, `NewRequestEmail`, `ApprovalEmail`, `DeclineEmail`** — The existing composers, each now returning both parts, with the words of the mocks `docs/mocks/emails/*`.
- **`IAppLinks`** — Greenlit.Application abstraction for the app's origin, so the composers can link to the Requests page and the calendar; `AppLinks` in Greenlit.Infrastructure reads `Greenlit:App:Origin`, as `InvitationLinks` and `PasswordResetLinks` do.
- **`IEmailSender`** — Unchanged contract: throws when the message is not handed over.
- **`AcsEmailSender`** — Greenlit.Infrastructure, over `Azure.Communication.Email`'s `EmailClient` with `DefaultAzureCredential` (the App Service's managed identity in production, `az login` on a developer's machine). Sends the text and HTML parts from `EmailOptions.From` / `FromName` and waits for the service to accept the message (`WaitUntil.Started`); a refusal or an exception surfaces as an exception.
- **`LoggingEmailSender`** — Unchanged: logs the recipient, the subject and the plain text.
- **`EmailOptions`** — `Greenlit:Email`: `Sender` (`Log`, the default, or `Acs`), `Endpoint` (`https://acs-greenlit-prod.unitedstates.communication.azure.com`), `From` (`no-reply@mail.greenlit.rocks`), `FromName` (`Greenlit`). `Acs` without an endpoint or a From address fails at startup; Production with `Log` warns at startup.

**Shared plumbing (exists today)**

- **`InviteMemberCommandHandler`, `CreateTeamCommandHandler`** — Send the invitation and roll the invitation back when sending fails (L2-010 AC4).
- **`RequestPasswordResetCommandHandler`** — Sends the reset link; a failed send is `email_failed` (L2-002 AC3).
- **`RequestNotifier`** — Sends the new-request, approval and decline emails under the team's switches and reports whether the message went (L2-043).
- **`IInvitationLinks`, `IPasswordResetLinks`** — Build the links from `Greenlit:App:Origin`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier; the acceptance criteria for each are in `docs/specs/L2.md`.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-053` | `L1-011`, `L1-001` | **Branded email.** Every email Greenlit sends is a branded HTML email with a plain-text twin, delivered through Azure Communication Services from Greenlit's own address. |

## Diagrams

### System context

Greenlit hands each email to Azure Communication Services, which delivers it. Incoming mail to the domain is Namecheap's forwarding, outside Greenlit.

![C4 system context for branded email](diagrams/c4-context.png)

### Containers

Only the API takes part: it composes the message and calls the mail service with its managed identity.

![C4 container view for branded email](diagrams/c4-container.png)

### Components

The handlers keep deciding who to email; the composers render both parts through `EmailLayout`; `IEmailSender` is `AcsEmailSender` in production and `LoggingEmailSender` everywhere else.

![C4 component view for branded email](diagrams/c4-component.png)

### Class structure

`EmailMessage` gains `Html`; `EmailLayout` is the one place the brand lives; `EmailOptions` picks the sender.

![Class diagram for branded email](diagrams/class-structure.png)

### Behaviour — send a branded email

A composer renders both parts, the handler sends, and a refusal by the mail service throws so the handler can undo what the email announced (ADR-006).

![Sequence diagram: send a branded email](diagrams/sequence-send.png)

## Decisions (journey 29, 7 Nov 2026)

| Topic | Decision |
|---|---|
| Provider and identity | Azure Communication Services Email with the API's managed identity (ADR-013). No key or connection string anywhere; `DefaultAzureCredential` finds the identity on the App Service and a developer's `az login` locally. |
| Sender domain | `mail.greenlit.rocks` because Namecheap's email forwarding locks the root SPF record; `Greenlit <no-reply@mail.greenlit.rocks>`. Replies bounce by design; the app is where people act. |
| Where the brand lives | One `EmailLayout` in Greenlit.Application, so a change to the look is one change; composers pass only words. The HTML mirrors `docs/mocks/emails/*`, which are the design reference. Dark mode is not attempted: the email is the light theme with `color-scheme: light`. |
| Logo | Drawn as a 3×4 table of 8px cells in the mark's pattern (brand green and the subtle grey), next to the wordmark in the display weight with the green ı. SVG and web fonts are dropped by major mail clients; this renders everywhere. |
| Links in emails | The invitation and reset links as before; the new-request email links to `/requests`, the decision emails to the calendar at `/`, both from `IAppLinks.Origin` (`Greenlit:App:Origin`, which must be `https://app.greenlit.rocks` in production). |
| Plain text | Kept for every email and still what `LoggingEmailSender` writes, so the e2e fixtures and developers read links from the log unchanged. |
| Failure | Unchanged per journey: the sender throws when the service refuses; invitations roll back, resets answer `email_failed`, decisions stay decided and say the email did not go. |
| Tests | API tests assert the recorded message's HTML (lockup, heading, button with the right link, footer) and that the text carries the same link, through `RecordingEmailSender`; `AcsEmailSender` itself is not exercised against Azure, so its wiring is checked by a startup test: `Sender=Acs` without an endpoint refuses to start. |
| Settings | `Greenlit__Email__Sender=Acs`, `Greenlit__Email__Endpoint`, `Greenlit__Email__From`, `Greenlit__Email__FromName` on `app-greenlit-api-prod`; the identity's Contributor role on `acs-greenlit-prod` is granted once by the operator (`README.md`). |

## Security and privacy

- **Secrets.** None: the managed identity authenticates. Nothing about the mail service is in the repository beyond the endpoint hostname and the From address, both public.
- **What an email contains.** Names, dates, the note or reason the person wrote, and one link. Invitation and reset links stay single-use and hashed at rest (ADR-006, ADR-011); the HTML carries the same link as the text, nothing more.
- **Logging.** The log sender writes the plain text, as before; `AcsEmailSender` logs the recipient and subject, never the body.
- **Spoofing.** SPF and DKIM on `mail.greenlit.rocks` let receivers verify Greenlit's mail; nothing else may send as that domain.
