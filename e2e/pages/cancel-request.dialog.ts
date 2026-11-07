import { Locator, Page } from "@playwright/test";

/**
 * The "Cancel this request?" dialog: opened from a pending request's Cancel request button on My requests,
 * in the app; dialogs/cancel-request/*.html in the mocks (docs/detailed-designs/requests/my-requests).
 * Not a screen, so it has no `data-page`.
 */
export class CancelRequestDialog {
  constructor(private readonly page: Page) {}

  /** The open dialog. */
  dialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator("#dlg-title", { hasText: "Cancel this request?" }) });
  }

  /** "Cancel this request?" */
  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  /** "16–20 Nov · 5 days · “Visiting family in Seville”" */
  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  /** "Maya Chen hasn’t decided yet. Cancelling removes the request and clears the yellow days from your row." */
  body(): Locator {
    return this.dialog().locator(".dialog__body p");
  }

  keep(): Locator {
    return this.dialog().getByRole("button", { name: "Keep request", exact: true });
  }

  /** The danger button: "Cancel request", "Cancelling…" (`aria-busy`) while the request is withdrawn. */
  cancel(): Locator {
    return this.dialog().locator(".dialog__footer .btn--danger");
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The danger alert after a failed cancel. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger");
  }
}
