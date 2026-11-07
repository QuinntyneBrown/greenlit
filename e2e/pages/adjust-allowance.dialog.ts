import { Locator, Page } from "@playwright/test";

/**
 * The "Adjust {First name}’s allowance" dialog: opened from "Adjust allowance" on a person's page, in the app;
 * dialogs/adjust-allowance/*.html in the mocks (docs/detailed-designs/allowances/adjust-allowance).
 * Not a screen, so it has no `data-page`.
 */
export class AdjustAllowanceDialog {
  constructor(private readonly page: Page) {}

  /** The open dialog for the member whose first name is `firstName`. */
  dialog(firstName: string): Locator {
    return this.page.getByRole("dialog", { name: `Adjust ${firstName}’s allowance`, exact: true });
  }

  /** Whichever adjust-allowance dialog is open. */
  anyDialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator("#dlg-title", { hasText: /^Adjust .+’s allowance$/ }) });
  }

  title(): Locator {
    return this.anyDialog().locator("#dlg-title");
  }

  /** "Carry-over, extra days or corrections." */
  description(): Locator {
    return this.anyDialog().locator("#dlg-title-desc");
  }

  days(): Locator {
    return this.anyDialog().getByLabel("Days", { exact: true });
  }

  /** "Use a negative number to remove days." */
  daysHelp(): Locator {
    return this.anyDialog().locator("#aa-days-help");
  }

  reason(): Locator {
    return this.anyDialog().getByLabel("Reason", { exact: true });
  }

  cancel(): Locator {
    return this.anyDialog().getByRole("button", { name: "Cancel", exact: true });
  }

  /** The primary button: "Add adjustment", "Adding…" (`aria-busy`) while busy, "Try again" after a failure. */
  add(): Locator {
    return this.anyDialog().locator(".dialog__footer .btn--primary");
  }

  /** The error summary after submitting with problems: "Fix 2 things to continue". */
  summary(): Locator {
    return this.anyDialog().locator(".form-summary");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  /** The error sentences under the fields, in order. */
  fieldErrors(): Locator {
    return this.anyDialog().locator(".field__error");
  }

  /** The danger alert after a failed save. */
  failure(): Locator {
    return this.anyDialog().locator(".alert--danger:not(.form-summary)");
  }
}
