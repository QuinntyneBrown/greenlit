import { Locator, Page } from "@playwright/test";

/**
 * The "Request time off" dialog: opened from the member's calendar in the app,
 * dialogs/new-request/*.html in the mocks (docs/detailed-designs/requests/send-request).
 * Not a screen, so it has no `data-page`.
 */
export class NewRequestDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Request time off", exact: true });
  }

  title(): Locator {
    return this.dialog().getByRole("heading", { name: "Request time off", exact: true });
  }

  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  /** The First day control (a date input). */
  firstDay(): Locator {
    return this.dialog().getByLabel("First day", { exact: true });
  }

  lastDay(): Locator {
    return this.dialog().getByLabel("Last day", { exact: true });
  }

  /** The note control; "(optional)" is part of its label. */
  note(): Locator {
    return this.dialog().getByLabel("Note (optional)", { exact: true });
  }

  /** The line under the fields that counts the days (a polite live region). */
  count(): Locator {
    return this.dialog().locator(".well");
  }

  /** The warning inside the count line when the request goes over the allowance ("That’s 4 days over."). */
  overage(): Locator {
    return this.count().locator("span", { hasText: " over." });
  }

  /** The "Send request" button; it reads "Sending…" while busy and "Try again" after a failure. */
  send(): Locator {
    return this.dialog().locator(".dialog__footer .btn--primary");
  }

  cancel(): Locator {
    return this.dialog().getByRole("button", { name: "Cancel", exact: true });
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The error summary after a send with problems: "Fix 1 thing to continue". */
  summary(): Locator {
    return this.dialog().locator(".form-summary");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  lastDayError(): Locator {
    return this.dialog().locator("#nr-end-err");
  }

  firstDayError(): Locator {
    return this.dialog().locator("#nr-start-err");
  }

  /** The danger alert after a failed send. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger:not(.form-summary)");
  }

  async fill(request: { first?: string; last?: string; note?: string }): Promise<void> {
    if (request.first !== undefined) await this.firstDay().fill(request.first);
    if (request.last !== undefined) await this.lastDay().fill(request.last);
    if (request.note !== undefined) await this.note().fill(request.note);
  }
}
