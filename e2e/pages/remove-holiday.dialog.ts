import { Locator, Page } from "@playwright/test";

/**
 * The "Remove {name}?" dialog: opened from a holiday's Remove button in Settings, in the app;
 * dialogs/remove-holiday/*.html in the mocks (docs/detailed-designs/teams/manage-holidays).
 * Not a screen, so it has no `data-page`.
 */
export class RemoveHolidayDialog {
  constructor(private readonly page: Page) {}

  /** The open dialog. */
  dialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator("#dlg-title", { hasText: /^Remove .+\?$/ }) });
  }

  /** "Remove Spring bank holiday?" */
  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  /** "Mon 25 May becomes a working day again for the whole team." */
  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  /** "It will count against allowances again for anyone who books it." */
  body(): Locator {
    return this.dialog().locator(".dialog__body p");
  }

  keep(): Locator {
    return this.dialog().getByRole("button", { name: "Keep it", exact: true });
  }

  /** The danger button: "Remove holiday", "Removing…" (`aria-busy`) while the holiday is removed. */
  remove(): Locator {
    return this.dialog().locator(".dialog__footer .btn--danger");
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The danger alert after a failed removal. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger");
  }
}
