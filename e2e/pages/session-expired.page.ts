import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The session-expired page: `/session-expired` in the app, pages/session-expired/default.html in the mocks
 * (docs/detailed-designs/identity-and-access/sign-out).
 */
export class SessionExpiredPage extends BasePage {
  readonly slug: PageSlug = "session-expired";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.heading();
  }

  /** "Your session has expired" */
  heading(): Locator {
    return this.main.locator(".card h1");
  }

  lead(): Locator {
    return this.main.locator(".card .lead");
  }

  /** The "Sign in" button, a link to sign-in. */
  signIn(): Locator {
    return this.main.getByRole("link", { name: "Sign in", exact: true });
  }
}
