import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * Year: `/year` in the app, pages/year/*.html in the mocks. The team's twelve months as slivers of
 * colour, and below it the allowance table (docs/detailed-designs/allowances/year-overview).
 */
export class YearPage extends BasePage {
  readonly slug: PageSlug = "year";

  constructor(page: Page) {
    super(page);
  }

  /** The grid, the empty state or the error state: whichever the year resolves to. */
  protected readyAnchor(): Locator {
    return this.page.locator(".year-grid:not([aria-busy='true']), .empty");
  }

  /** The year, e.g. "2026". */
  title(): Locator {
    return this.main.locator(".period-nav h1");
  }

  previousYear(): Locator {
    return this.main.getByRole("button", { name: "Previous year", exact: true });
  }

  nextYear(): Locator {
    return this.main.getByRole("button", { name: "Next year", exact: true });
  }

  legendItems(): Locator {
    return this.main.getByRole("list", { name: "Legend" }).locator(".legend__item");
  }

  intro(): Locator {
    return this.main.getByText("The whole team's year in one view. Select a month to open it.", { exact: true });
  }

  // ---- the grid ----

  /** The grid labelled "Time off by month". */
  grid(): Locator {
    return this.main.getByRole("grid", { name: "Time off by month", exact: true });
  }

  /** The month column headers in order: Jan to Dec. */
  monthHeaders(): Locator {
    return this.grid().locator(".year-grid__month");
  }

  /** The month header link, e.g. "Nov". */
  monthHeader(month: string): Locator {
    return this.grid().locator(".year-grid__month", { hasText: new RegExp(`^${month}$`) });
  }

  /** Member names down the side in row order. */
  memberNames(): Locator {
    return this.grid().locator(".year-grid__name .grid-name__text");
  }

  /** The "You" mark beside a name. */
  you(member: string): Locator {
    return this.grid().locator(".year-grid__name", { hasText: member }).locator(".grid-name__you");
  }

  /** The month cell of a member, found by its accessible name "{member}, {Month}: {n} confirmed days off". */
  month(member: string, month: string): Locator {
    return this.grid().locator(`a.year-month[aria-label^="${member}, ${month}:"]`);
  }

  /** The `data-status` of each sliver of a month cell, in date order. */
  async slivers(member: string, month: string): Promise<(string | null)[]> {
    return this.month(member, month)
      .locator(".sliver")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-status")));
  }

  /** The placeholder cells shown while the year loads. */
  placeholderCells(): Locator {
    return this.grid().locator("[role='gridcell'] .skeleton");
  }

  // ---- the allowance table ----

  /** The section heading, e.g. "Allowance in 2026". */
  summaryHeading(): Locator {
    return this.main.getByRole("heading", { level: 2, name: /^Allowance in \d{4}$/ });
  }

  summaryHint(): Locator {
    return this.main.getByText("Sort by days left to see who hasn't had a break yet.", { exact: true });
  }

  /** The table named by its caption, "Allowance in 2026". */
  table(): Locator {
    return this.main.getByRole("table", { name: /^Allowance in \d{4}$/ });
  }

  /** The column headings in order: Person to Usage. */
  tableHeaders(): Locator {
    return this.table().getByRole("columnheader");
  }

  /** The sort control; it reads pressed once the rows are ordered by days left. */
  sortByDaysLeft(): Locator {
    return this.main.getByRole("button", { name: "Most days left first", exact: true });
  }

  /** Each row's person, in row order. */
  tablePeople(): Locator {
    return this.table().locator("tbody tr td:first-child .cluster > :not(.avatar)");
  }

  /** A person's row. */
  tableRow(person: string): Locator {
    return this.table().locator("tbody tr", { has: this.page.locator("td:first-child", { hasText: person }) });
  }

  /** The figures of a person's row after their name: Allowance, Used, Booked, Requested, Left. */
  figures(person: string): Locator {
    return this.tableRow(person).locator("td.num");
  }

  /** The usage bar of a person's row; its name says the numbers. */
  usageBar(person: string): Locator {
    return this.tableRow(person).getByRole("img");
  }

  // ---- the states ----

  /** The empty state or the error state card. */
  notice(): Locator {
    return this.main.locator(".empty");
  }

  noticeTitle(): Locator {
    return this.notice().locator(".empty__title");
  }

  noticeText(): Locator {
    return this.notice().locator(".empty__text");
  }

  openSettings(): Locator {
    return control(this.notice(), "Open settings");
  }

  tryAgain(): Locator {
    return control(this.notice(), "Try again");
  }
}
