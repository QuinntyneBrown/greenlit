import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
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

  // ---- time off and adjustments ----

  /** The rows of the section titled `title`: "Upcoming", "Taken in 2026" or "Allowance adjustments". */
  rows(title: string | RegExp): Locator {
    return this.section(title).locator(".run-list li");
  }

  /** The words of a section that has no rows, e.g. "No adjustments.". */
  emptyNote(title: string | RegExp): Locator {
    return this.section(title).locator("p");
  }

  /** A section of the lists, found by its heading. */
  section(title: string | RegExp): Locator {
    return this.main.locator("section", { has: this.page.getByRole("heading", { level: 2, name: title }) });
  }

  // ---- the actions ----

  /** The "Request time off" button of the facts bar: on a member's own page only. */
  requestTimeOff(): Locator {
    return control(this.main.locator(".facts-bar"), "Request time off");
  }

  /** The manager's "Adjust allowance" section: heading, hint and the button. */
  adjustAllowanceSection(): Locator {
    return this.main.locator("section", { has: this.page.getByRole("heading", { level: 2, name: "Adjust allowance" }) });
  }

  adjustAllowance(): Locator {
    return control(this.adjustAllowanceSection(), "Adjust allowance");
  }

  /** The manager's Working days section: heading, hint, the days and "Edit working days". */
  workingDaysSection(): Locator {
    return this.main.locator("section", { has: this.page.getByRole("heading", { level: 2, name: "Working days" }) });
  }

  /** The days the person works, e.g. "Mon, Tue, Wed, Thu, Fri". */
  workingDays(): Locator {
    return this.workingDaysSection().locator("p").nth(1);
  }

  editWorkingDays(): Locator {
    return control(this.workingDaysSection(), "Edit working days");
  }

  /** The manager's "Remove from team" section: heading, hint and "Remove {first name}". */
  removeSection(): Locator {
    return this.main.locator("section", { has: this.page.getByRole("heading", { level: 2, name: "Remove from team" }) });
  }

  /** "Remove Ben": opens the confirmation dialog. */
  remove(firstName: string): Locator {
    return control(this.removeSection(), `Remove ${firstName}`);
  }

  /** True when the page is wider than the screen. */
  async scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  }

  // ---- the states ----

  /** The page's heading when it is not the person's name: "Time off", "Person not found", "Loading time off". */
  pageHeading(): Locator {
    return this.main.getByRole("heading", { level: 1 });
  }

  /** The placeholders shown while the person loads. */
  placeholders(): Locator {
    return this.main.locator(".skeleton");
  }

  /** The notice that replaces the page: forbidden, not found or error. */
  notice(): Locator {
    return this.main.locator(".empty");
  }

  noticeTitle(): Locator {
    return this.notice().locator(".empty__title");
  }

  noticeText(): Locator {
    return this.notice().locator(".empty__text");
  }

  /** A button or link of the notice, e.g. "Try again". */
  noticeAction(name: string): Locator {
    return control(this.notice().locator(".empty__actions"), name);
  }
}
