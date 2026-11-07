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

  // ---- the year at a glance ----

  /** "2026 at a glance". */
  yearHeading(): Locator {
    return this.main.getByRole("heading", { level: 2, name: /at a glance$/ });
  }

  /** The legend beside the year heading. */
  legendItems(): Locator {
    return this.main.getByRole("list", { name: "Legend" }).locator(".legend__item");
  }

  /** The twelve month titles in order. */
  monthTitles(): Locator {
    return this.main.locator(".month-mini__title");
  }

  /** The weekday initials of the first month: M T W T F S S. */
  weekdayInitials(): Locator {
    return this.main.locator(".month-mini__days").first().locator(".mini-head");
  }

  /** One day of a month, found by its name, e.g. `day("November", 16)` is "16 November: Requested". */
  day(month: string, day: number): Locator {
    return this.main
      .locator(".month-mini-grid > div", { has: this.page.locator(".month-mini__title", { hasText: month }) })
      .locator(`.mini-day[aria-label^="${day} ${month}:"]`);
  }
}
