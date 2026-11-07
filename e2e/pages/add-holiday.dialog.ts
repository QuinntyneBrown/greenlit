import { Locator, Page } from "@playwright/test";

/**
 * The "Add a day off" dialog: opened from Settings in the app, dialogs/add-holiday/*.html in the mocks
 * (docs/detailed-designs/teams/manage-holidays). Not a screen, so it has no `data-page`.
 */
export class AddHolidayDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Add a day off", exact: true });
  }

  title(): Locator {
    return this.dialog().getByRole("heading", { name: "Add a day off", exact: true });
  }

  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  date(): Locator {
    return this.dialog().getByLabel("Date", { exact: true });
  }

  name(): Locator {
    return this.dialog().getByLabel("Name", { exact: true });
  }

  /** The "Add day off" button; it reads "Adding…" while busy and "Try again" after a failure. */
  add(): Locator {
    return this.dialog().locator(".dialog__footer .btn--primary");
  }

  cancel(): Locator {
    return this.dialog().getByRole("button", { name: "Cancel", exact: true });
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The error summary after a submit with problems: "Fix 2 things to continue". */
  summary(): Locator {
    return this.dialog().locator(".form-summary");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  dateError(): Locator {
    return this.dialog().locator("#ah-date-err");
  }

  nameError(): Locator {
    return this.dialog().locator("#ah-name-err");
  }

  /** The danger alert after a failed add. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger:not(.form-summary)");
  }

  async fill(day: { date?: string; name?: string }): Promise<void> {
    if (day.date !== undefined) await this.date().fill(day.date);
    if (day.name !== undefined) await this.name().fill(day.name);
  }
}
