import { Locator, Page } from "@playwright/test";

/**
 * The "Add a child" dialog: opened from Settings → Team while the school calendar is on, dialogs/add-child/*.html in
 * the mocks (docs/detailed-designs/teams/school-calendar, L2-060 AC2). Not a screen, so it has no `data-page`.
 */
export class AddChildDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Add a child", exact: true });
  }

  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  name(): Locator {
    return this.dialog().getByLabel("Name", { exact: true });
  }

  email(): Locator {
    return this.dialog().getByLabel("Email (optional)", { exact: true });
  }

  emailHelp(): Locator {
    return this.dialog().locator("#ac-email-help");
  }

  /** "Add child"; it reads "Adding…" while busy and "Try again" after a failure. */
  add(): Locator {
    return this.dialog().locator(".dialog__footer .btn--primary");
  }

  nameError(): Locator {
    return this.dialog().locator("#ac-name-err");
  }

  failure(): Locator {
    return this.dialog().locator(".alert--danger:not(.form-summary)");
  }

  success(): Locator {
    return this.dialog().locator(".alert--success");
  }

  successTitle(): Locator {
    return this.success().locator(".alert__title");
  }

  successText(): Locator {
    return this.success().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  done(): Locator {
    return this.dialog().getByRole("button", { name: "Done", exact: true });
  }
}
