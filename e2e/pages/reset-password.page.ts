import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The reset-password page: `/reset-password/:token` in the app, pages/reset-password/*.html in the
 * mocks (docs/detailed-designs/identity-and-access/reset-password).
 */
export class ResetPasswordPage extends BasePage {
  readonly slug: PageSlug = "reset-password";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.heading();
  }

  /** The card's heading: "Choose a new password", then "All done". */
  heading(): Locator {
    return this.main.locator(".card h1");
  }

  lead(): Locator {
    return this.main.locator(".card .lead");
  }

  /** The placeholder shown while the link is checked. */
  loading(): Locator {
    return this.main.locator('[aria-busy="true"]');
  }

  newPassword(): Locator {
    return this.main.getByLabel("New password", { exact: true });
  }

  newPasswordHelp(): Locator {
    return this.main.locator("#rp-new-help");
  }

  confirm(): Locator {
    return this.main.getByLabel("Confirm new password", { exact: true });
  }

  update(): Locator {
    return this.main.getByRole("button", { name: "Update password", exact: true });
  }

  /** The error summary shown after a submit attempt with invalid fields. */
  summary(): Locator {
    return this.main.locator(".form-summary");
  }

  summaryTitle(): Locator {
    return this.summary().locator(".alert__title");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  /** The sentence under a field: "new" or "confirm". */
  fieldError(field: "new" | "confirm"): Locator {
    return this.main.locator(`#rp-${field}-err`);
  }

  /** The danger alert of the expired and failed states (not the summary). */
  failure(): Locator {
    return this.main.locator(".alert--danger:not(.form-summary)");
  }

  failureTitle(): Locator {
    return this.failure().locator(".alert__title");
  }

  failureText(): Locator {
    return this.failure().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  /** "Request a new link" (expired). */
  requestNewLink(): Locator {
    return control(this.main, "Request a new link");
  }

  /** The success alert: "Password updated" and "You can sign in with your new password." */
  done(): Locator {
    return this.main.locator(".alert--success");
  }

  doneTitle(): Locator {
    return this.done().locator(".alert__title");
  }

  doneText(): Locator {
    return this.done().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  signIn(): Locator {
    return control(this.main, "Sign in");
  }

  async fill(fields: { password?: string; confirm?: string }): Promise<void> {
    if (fields.password !== undefined) await this.newPassword().fill(fields.password);
    if (fields.confirm !== undefined) await this.confirm().fill(fields.confirm);
  }
}
