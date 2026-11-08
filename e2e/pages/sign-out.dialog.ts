import { Locator, Page } from "@playwright/test";

/**
 * The "Sign out of Greenlit?" dialog: opened from the account menu's Sign out, in the app;
 * dialogs/sign-out/*.html in the mocks (docs/detailed-designs/identity-and-access/sign-out).
 * Not a screen, so it has no `data-page`.
 */
export class SignOutDialog {
  constructor(private readonly page: Page) {}

  /** The open dialog. */
  dialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator("#dlg-title", { hasText: "Sign out of Greenlit?" }) });
  }

  /** "Sign out of Greenlit?" */
  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  /** The description under the title; the sign-out dialog has none. */
  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  /** "Anything you’ve already saved stays saved." */
  body(): Locator {
    return this.dialog().locator(".dialog__body p");
  }

  stay(): Locator {
    return this.dialog().getByRole("button", { name: "Stay signed in", exact: true });
  }

  /** The primary button: "Sign out", "Signing out…" (`aria-busy`) while the request is in flight. */
  signOut(): Locator {
    return this.dialog().locator(".dialog__footer .btn--primary");
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }
}
