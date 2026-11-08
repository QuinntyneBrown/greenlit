# ADR-013: Branded HTML email, delivered through Azure Communication Services

**Status:** Accepted (supersedes the "only implementation for now" part of ADR-006)
**Date:** 2026-11-07

## Context

ADR-006 left the email provider open: `LoggingEmailSender` wrote every message to the log, and
nothing reached a real person. Greenlit now runs at app.greenlit.rocks with real invitations,
password resets and request notifications (L2-010, L2-002, L2-043), so emails have to be delivered,
and they should look like Greenlit (L2-053). The product's domain, `greenlit.rocks`, has its DNS at
Namecheap, whose free email forwarding (catch-all to the owner's mailbox) is in use and locks the
root domain's SPF record. The API runs on an Azure App Service (ADR-011).

## Decision

- **Provider.** Azure Communication Services Email: `acs-email-greenlit-prod` (Email Communication
  Service) with the customer-managed domain `mail.greenlit.rocks`, linked to `acs-greenlit-prod`
  (Communication Services), all in `rg-greenlit-prod`. Same subscription as the API, no new vendor
  account, pay per message.
- **Sender domain.** `mail.greenlit.rocks`, not the root: Namecheap's forwarding owns the root SPF
  record, and sending from a subdomain keeps the two apart. The From address is
  `Greenlit <no-reply@mail.greenlit.rocks>`. Its DNS at Namecheap: a TXT verification record and an
  SPF record on `mail`, and two DKIM CNAMEs (`selector1-azurecomm-prod-net._domainkey.mail`,
  `selector2-…`). Incoming mail to any address at greenlit.rocks is forwarded by Namecheap to the
  owner's mailbox; Greenlit never receives mail itself.
- **Authentication.** The API's system-assigned managed identity, with Contributor on the
  Communication Services resource, through `DefaultAzureCredential`; no connection string or key
  is stored anywhere. Locally, `DefaultAzureCredential` picks up a developer's `az login`.
- **Code.** `IEmailSender` is unchanged; `EmailMessage` gains an `Html` part beside the plain
  `Body`. `AcsEmailSender` (Greenlit.Infrastructure, packages `Azure.Communication.Email` and
  `Azure.Identity`) sends both parts and waits for the service to accept the message; a refusal
  throws, as ADR-006 requires. `Greenlit:Email:Sender` picks `Log` (the default, and what tests and
  the e2e API use) or `Acs`, which also needs `Greenlit:Email:Endpoint` and `Greenlit:Email:From`.
  Production warns at startup when it is still logging.
- **Branding.** `EmailLayout` in Greenlit.Application renders every email from one layout: the
  logo lockup drawn with table cells (email clients drop SVG), a heading in the display weight, body
  copy, one primary button, a muted note and the footer, all with inline styles whose values come
  from the design tokens (`docs/design-system/tokens/tokens.css`) because email clients ignore
  stylesheets. Each email keeps a plain-text twin that carries the same links, which is what the
  log sender writes and the Playwright suite reads.

## Consequences

- A real email per invitation, reset and notification; costs are fractions of a cent.
- The log keeps the plain-text part only, so developers still read links from it.
- Deliverability depends on the DNS records at Namecheap staying in place; Azure re-checks them.
- DMARC is not set for `mail.greenlit.rocks`; add a `_dmarc.mail` TXT record if deliverability
  reports call for it.
- Replies to `no-reply@mail.greenlit.rocks` bounce; the forwarding covers `@greenlit.rocks` only.
