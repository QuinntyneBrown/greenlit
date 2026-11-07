import { Locator, Page } from "@playwright/test";

/**
 * The "Remove {First name} from the team?" dialog: opened from "Remove {first name}" on a person's page, in the
 * app; dialogs/remove-member/*.html in the mocks (docs/detailed-designs/teams/remove-member).
 * Not a screen, so it has no `data-page`.
 */
export class RemoveMemberDialog {
  constructor(private readonly page: Page) {}

  /** The open dialog, whoever it is about. */
  dialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator("#dlg-title", { hasText: /^Remove .+ from the team\?$/ }) });
  }

  /** "Remove Ben from the team?" */
  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  /** "Their history is kept, but they won’t appear on the calendar." */
  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  /** What changes, one sentence per item. */
  consequences(): Locator {
    return this.dialog().locator(".dialog__body li");
  }

  cancel(): Locator {
    return this.dialog().getByRole("button", { name: "Cancel", exact: true });
  }

  /** The danger button: "Yes, remove Ben", "Removing…" (`aria-busy`) while the member is removed. */
  confirm(): Locator {
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
