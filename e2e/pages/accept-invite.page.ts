import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The accept-invitation page: `/accept-invite/:token` in the app, pages/accept-invite/*.html in
 * the mocks (docs/detailed-designs/identity-and-access/accept-invitation).
 */
export class AcceptInvitePage extends BasePage {
  readonly slug: PageSlug = "accept-invite";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.heading();
  }

  /** The card's heading: "Join {team}", "Join your team" while loading, then "Welcome, {first name}". */
  heading(): Locator {
    return this.main.locator(".card h1");
  }

  lead(): Locator {
    return this.main.locator(".card .lead");
  }

  /** The placeholder shown while the invitation loads. */
  loading(): Locator {
    return this.main.locator('[aria-busy="true"]');
  }

  name(): Locator {
    return this.main.getByLabel("Your name", { exact: true });
  }

  email(): Locator {
    return this.main.getByLabel("Email", { exact: true });
  }

  emailHelp(): Locator {
    return this.main.locator("#ai-email-help");
  }

  password(): Locator {
    return this.main.getByLabel("Choose a password", { exact: true });
  }

  confirm(): Locator {
    return this.main.getByLabel("Confirm password", { exact: true });
  }

  join(): Locator {
    return this.main.getByRole("button", { name: "Join the team", exact: true });
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

  /** The sentence under a field: "name", "password" or "confirm". */
  fieldError(field: "name" | "password" | "confirm"): Locator {
    return this.main.locator(`#ai-${field === "password" ? "pw" : field}-err`);
  }

  /** The danger alert of the expired, unavailable and failed states (not the summary). */
  failure(): Locator {
    return this.main.locator(".alert--danger:not(.form-summary)");
  }

  failureTitle(): Locator {
    return this.failure().locator(".alert__title");
  }

  failureText(): Locator {
    return this.failure().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  /** "Go to sign in" (expired, already has an account) and "Try again" (unavailable). */
  goToSignIn(): Locator {
    return control(this.main, "Go to sign in");
  }

  tryAgain(): Locator {
    return control(this.main, "Try again");
  }

  /** The success alert: "You’re in" and "Welcome to {team}. Your row is on the calendar." */
  welcome(): Locator {
    return this.main.locator(".alert--success");
  }

  welcomeTitle(): Locator {
    return this.welcome().locator(".alert__title");
  }

  welcomeText(): Locator {
    return this.welcome().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  openCalendar(): Locator {
    return control(this.main, "Open the calendar");
  }

  async fill(fields: { name?: string; password?: string; confirm?: string }): Promise<void> {
    if (fields.name !== undefined) await this.name().fill(fields.name);
    if (fields.password !== undefined) await this.password().fill(fields.password);
    if (fields.confirm !== undefined) await this.confirm().fill(fields.confirm);
  }
}
