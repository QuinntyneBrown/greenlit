import { Locator, Page } from "@playwright/test";

/**
 * The "Decline request" dialog: opened from a pending request's Decline button on the Requests page or
 * from its detail, in the app; dialogs/decline-request/*.html in the mocks
 * (docs/detailed-designs/requests/decline-request). Not a screen, so it has no `data-page`.
 */
export class DeclineRequestDialog {
  constructor(private readonly page: Page) {}

  /** The open dialog, whoever's request it is about. */
  dialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator("#dc-reason") });
  }

  /** "Decline Ana’s request?" */
  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  /** "Ana Ruiz asked for 16–20 Nov (5 days)." */
  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  /** The Reason control; "(optional)" is part of its label. */
  reason(): Locator {
    return this.dialog().getByLabel("Reason (optional)", { exact: true });
  }

  /** "Ana will see this. Leave it blank to decline without a reason." */
  help(): Locator {
    return this.dialog().locator(".field__help");
  }

  keepPending(): Locator {
    return this.dialog().getByRole("button", { name: "Keep pending", exact: true });
  }

  /** The danger button: "Decline request", "Declining…" (`aria-busy`) while the decision is recorded. */
  decline(): Locator {
    return this.dialog().locator(".dialog__footer .btn--danger");
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The danger alert after a failed decision. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger");
  }
}
