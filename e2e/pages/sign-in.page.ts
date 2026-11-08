import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The sign-in page: `/sign-in` in the app, pages/sign-in/*.html in the mocks
 * (docs/detailed-designs/identity-and-access/sign-in).
 */
export class SignInPage extends BasePage {
  readonly slug: PageSlug = "sign-in";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.heading();
  }

  /** The card's heading: "Sign in", then "Signed in". */
  heading(): Locator {
    return this.main.locator(".card h1");
  }

  lead(): Locator {
    return this.main.locator(".card .lead");
  }

  /** The logo above the card, a link to sign-in. */
  logoLink(): Locator {
    return this.main.getByRole("link", { name: "Greenlit, sign in", exact: true });
  }

  email(): Locator {
    return this.main.getByLabel("Email", { exact: true });
  }

  password(): Locator {
    return this.main.getByLabel("Password", { exact: true });
  }

  submit(): Locator {
    return this.main.getByRole("button", { name: "Sign in", exact: true });
  }

  forgotPassword(): Locator {
    return this.main.getByRole("link", { name: "Forgot your password?", exact: true });
  }

  /** The "or" rule between the password form and Continue with Google (L2-051 AC1). */
  divider(): Locator {
    return this.main.getByRole("separator", { name: "or", exact: true });
  }

  continueWithGoogle(): Locator {
    return this.main.getByRole("button", { name: "Continue with Google", exact: true });
  }

  /** Google's "G" mark before the Continue with Google label (L2-051 AC1). */
  googleMark(): Locator {
    return this.continueWithGoogle().locator("svg");
  }

  /** "Set up your team now" on the panel a new Google account gets (L2-051 AC4). */
  setUpTeamNow(): Locator {
    return this.main.getByRole("link", { name: "Set up your team now", exact: true });
  }

  /** The note under the card: where a newcomer can go. */
  inviteNote(): Locator {
    return this.main.locator(".auth-card > .text-caption");
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

  /** The danger alert after a failed sign-in (not the summary). */
  failure(): Locator {
    return this.main.locator(".alert--danger:not(.form-summary)");
  }

  failureTitle(): Locator {
    return this.failure().locator(".alert__title");
  }

  failureText(): Locator {
    return this.failure().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  /** The success panel's alert: "Welcome back, Maya" and "Taking you to your calendar…". */
  welcome(): Locator {
    return this.main.locator(".alert--success");
  }

  welcomeTitle(): Locator {
    return this.welcome().locator(".alert__title");
  }

  welcomeText(): Locator {
    return this.welcome().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  progress(): Locator {
    return this.main.getByRole("progressbar", { name: "Signing you in", exact: true });
  }

  goToCalendarNow(): Locator {
    return this.main.getByRole("link", { name: "Go to the calendar now", exact: true });
  }

  async fill(email: string, password: string): Promise<void> {
    await this.email().fill(email);
    await this.password().fill(password);
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.fill(email, password);
    await this.submit().click();
  }
}
