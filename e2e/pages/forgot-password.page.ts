import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The forgot-password page: `/forgot-password` in the app, pages/forgot-password/*.html in the
 * mocks (docs/detailed-designs/identity-and-access/reset-password).
 */
export class ForgotPasswordPage extends BasePage {
  readonly slug: PageSlug = "forgot-password";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.heading();
  }

  /** The card's heading: "Reset your password", then "Check your email". */
  heading(): Locator {
    return this.main.locator(".card h1");
  }

  lead(): Locator {
    return this.main.locator(".card .lead");
  }

  email(): Locator {
    return this.main.getByLabel("Email", { exact: true });
  }

  emailHelp(): Locator {
    return this.main.locator("#fp-email-help");
  }

  send(): Locator {
    return this.main.getByRole("button", { name: "Send reset link", exact: true });
  }

  backToSignIn(): Locator {
    return control(this.main, "Back to sign in");
  }

  /** The error summary shown after a submit attempt with an invalid email. */
  summary(): Locator {
    return this.main.locator(".form-summary");
  }

  summaryTitle(): Locator {
    return this.summary().locator(".alert__title");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  /** The sentence under the field after an invalid attempt. */
  emailError(): Locator {
    return this.main.locator("#fp-email-err");
  }

  /** The danger alert after a delivery failure (not the summary). */
  failure(): Locator {
    return this.main.locator(".alert--danger:not(.form-summary)");
  }

  failureTitle(): Locator {
    return this.failure().locator(".alert__title");
  }

  failureText(): Locator {
    return this.failure().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  /** The success alert: "Check your email" and where the link is on its way. */
  sent(): Locator {
    return this.main.locator(".alert--success");
  }

  sentTitle(): Locator {
    return this.sent().locator(".alert__title");
  }

  sentText(): Locator {
    return this.sent().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  async requestLink(email: string): Promise<void> {
    await this.email().fill(email);
    await this.send().click();
  }
}
