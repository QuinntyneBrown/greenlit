import { Locator, Page } from "@playwright/test";

/**
 * The "{First name}’s working days" dialog: opened from a member's "Edit working days" button in Settings, in
 * the app; dialogs/edit-working-days/*.html in the mocks (docs/detailed-designs/teams/working-days).
 * Not a screen, so it has no `data-page`.
 */
export class EditWorkingDaysDialog {
  constructor(private readonly page: Page) {}

  /** The open dialog for the member whose first name is `firstName`. */
  dialog(firstName: string): Locator {
    return this.page.getByRole("dialog", { name: `${firstName}’s working days`, exact: true });
  }

  /** Whichever working-days dialog is open. */
  anyDialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator("#dlg-title", { hasText: /’s working days$/ }) });
  }

  title(): Locator {
    return this.anyDialog().locator("#dlg-title");
  }

  /** "For part-timers. Dev currently works Mon, Tue, Wed, Thu." */
  description(): Locator {
    return this.anyDialog().locator("#dlg-title-desc");
  }

  /** The seven chips, Mon to Sun. */
  days(): Locator {
    return this.anyDialog().getByRole("group", { name: "Working days", exact: true }).locator(".chip--day");
  }

  day(name: string): Locator {
    return this.days().filter({ hasText: name });
  }

  /** "Days they don’t work show red on their row and never count against allowance." */
  help(): Locator {
    return this.anyDialog().locator(".field__help");
  }

  cancel(): Locator {
    return this.anyDialog().getByRole("button", { name: "Cancel", exact: true });
  }

  close(): Locator {
    return this.anyDialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The primary button: "Save working days", "Saving…" (`aria-busy`) while busy, "Try again" after a failure. */
  save(): Locator {
    return this.anyDialog().locator(".dialog__footer .btn--primary");
  }

  /** The error summary after a save with no day on: "Fix 1 thing to continue". */
  summary(): Locator {
    return this.anyDialog().locator(".form-summary");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  /** "Pick at least one working day." under the chips. */
  daysError(): Locator {
    return this.anyDialog().locator(".field__error");
  }

  /** The danger alert after a failed save. */
  failure(): Locator {
    return this.anyDialog().locator(".alert--danger:not(.form-summary)");
  }
}
