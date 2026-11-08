import { Locator, Page } from "@playwright/test";

/**
 * The "Import a school calendar" dialog: opened from Settings → School calendar, dialogs/import-calendar/*.html in
 * the mocks (docs/detailed-designs/teams/school-calendar, L2-062).
 */
export class ImportCalendarDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Import a school calendar", exact: true });
  }

  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  child(): Locator {
    return this.dialog().getByLabel("Child", { exact: true });
  }

  /** The file input, named "Calendar file Choose an .ics file". */
  file(): Locator {
    return this.dialog().locator("input[type=file]");
  }

  fileButton(): Locator {
    return this.dialog().locator(".file-field__button");
  }

  fileName(): Locator {
    return this.dialog().locator(".file-field__name");
  }

  fileHelp(): Locator {
    return this.dialog().locator("#ic-file-help");
  }

  /** "Importing again replaces the … closures from …'s last import. Closures you added yourself stay." */
  replaceNote(): Locator {
    return this.dialog().locator(".inline-note");
  }

  /** "Import"; "Importing…" while busy. */
  importButton(): Locator {
    return this.dialog().locator(".dialog__footer .btn--primary");
  }

  failureTitle(): Locator {
    return this.dialog().locator(".alert--danger .alert__title");
  }

  failureText(): Locator {
    return this.dialog().locator(".alert--danger .alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  successTitle(): Locator {
    return this.dialog().locator(".alert--success .alert__title");
  }

  successText(): Locator {
    return this.dialog().locator(".alert--success .alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  done(): Locator {
    return this.dialog().getByRole("button", { name: "Done", exact: true });
  }

  async choose(name: string, text: string): Promise<void> {
    await this.file().setInputFiles({ name, mimeType: "text/calendar", buffer: Buffer.from(text, "utf8") });
  }
}
