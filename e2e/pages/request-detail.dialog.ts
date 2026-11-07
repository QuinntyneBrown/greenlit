import { Locator, Page } from "@playwright/test";

/**
 * The request detail drawer: opened from a request's name on the Requests page in the app,
 * dialogs/request-detail/*.html in the mocks (docs/detailed-designs/requests/approve-request).
 * Not a screen, so it has no `data-page`.
 */
export class RequestDetailDialog {
  constructor(private readonly page: Page) {}

  /** The open drawer, whoever's request it shows. */
  dialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator(".drawer") });
  }

  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  /** "16–20 Nov · 5 days" */
  description(): Locator {
    return this.dialog().locator("#dlg-desc");
  }

  status(): Locator {
    return this.dialog().locator(".req-status");
  }

  sent(): Locator {
    return this.dialog().locator(".facts div", { hasText: "Sent" }).locator("dd");
  }

  note(): Locator {
    return this.dialog().locator(".quote");
  }

  /** The footer's Approve button: "Approving…" while busy, "Try approving again" after a failure. */
  approve(): Locator {
    return this.dialog().locator(".drawer__footer .btn--approve");
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The danger alert after a failed decision. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger");
  }
}
