import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * A person's page: `/people/{id}` in the app, pages/person/*.html in the mocks. Days left, the facts bar,
 * the year at a glance and the person's time off (docs/detailed-designs/allowances/person-page).
 */
export class PersonPage extends BasePage {
  readonly slug: PageSlug = "person";

  constructor(page: Page) {
    super(page);
  }

  /** The page's head, or the notice that replaces it (forbidden, not found, error). */
  protected readyAnchor(): Locator {
    return this.page.locator("main#main .person-head:not(:has(.skeleton)), main#main .empty");
  }

  // ---- the head ----

  /** The "Calendar" link back to the sheet. */
  backLink(): Locator {
    return this.main.locator("a.back-link");
  }

  /** The person's name. */
  name(): Locator {
    return this.main.locator(".person-head h1");
  }

  /** Under the name: job title, "Joined Mar 2022" and, for a part-timer, "Works Mon, Tue, Wed, Thu". */
  subtitle(): Locator {
    return this.main.locator(".person-head__id p");
  }

  /** The days left figure. */
  daysLeft(): Locator {
    return this.main.locator(".big-number");
  }

  /** Under the figure: "days left in 2026" and, when over, how far. */
  daysLeftCaption(): Locator {
    return this.main.locator(".big-number + p");
  }

  // ---- the figures ----

  /** The labels of the facts bar in order. */
  factLabels(): Locator {
    return this.main.locator(".facts dt");
  }

  /** The value (and note) of one fact, e.g. "Allowance". */
  fact(label: string): Locator {
    return this.main.locator(".facts > div", { has: this.page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");
  }
}
