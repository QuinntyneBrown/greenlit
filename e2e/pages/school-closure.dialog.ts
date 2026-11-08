import { Locator, Page } from "@playwright/test";

/**
 * The "Add a school closure" and "Edit school closure" dialog: opened from Settings → School calendar,
 * dialogs/school-closure/*.html in the mocks (docs/detailed-designs/teams/school-calendar, L2-061).
 */
export class SchoolClosureDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: /^(Add a school closure|Edit school closure)$/ });
  }

  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  label(): Locator {
    return this.dialog().getByLabel("What is it?", { exact: true });
  }

  firstDay(): Locator {
    return this.dialog().getByLabel("First day", { exact: true });
  }

  lastDay(): Locator {
    return this.dialog().getByLabel("Last day", { exact: true });
  }

  whose(): Locator {
    return this.dialog().getByLabel("Whose calendar?", { exact: true });
  }

  async whoseOptions(): Promise<string[]> {
    return (await this.whose().locator("option").allTextContents()).map((t) => t.trim());
  }

  /** "Add closure" or "Save closure"; "Adding…" or "Saving…" while busy. */
  submit(): Locator {
    return this.dialog().locator(".dialog__footer .btn--primary");
  }

  summaryTitle(): Locator {
    return this.dialog().locator(".form-summary .alert__title");
  }

  summaryLinks(): Locator {
    return this.dialog().locator(".form-summary").getByRole("link");
  }

  async fill(closure: { label?: string; first?: string; last?: string; whose?: string }): Promise<void> {
    if (closure.label !== undefined) await this.label().fill(closure.label);
    if (closure.first !== undefined) await this.firstDay().fill(closure.first);
    if (closure.last !== undefined) await this.lastDay().fill(closure.last);
    if (closure.whose !== undefined) await this.whose().selectOption({ label: closure.whose });
  }
}

/** The "Delete {label}?" dialog (dialogs/delete-closure/*, L2-061 AC6). */
export class DeleteClosureDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: /^Delete .+\?$/ });
  }

  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  confirm(): Locator {
    return this.dialog().locator(".dialog__footer .btn--danger");
  }
}
