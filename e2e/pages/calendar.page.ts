import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The team calendar, Greenlit's home screen: `/` in the app,
 * pages/calendar/*.html in the mocks (docs/detailed-designs/sheet/view-month).
 */
export class CalendarPage extends BasePage {
  readonly slug: PageSlug = "calendar";

  constructor(page: Page) {
    super(page);
  }

  /** The grid, the empty state or the error state: whichever the month resolves to. */
  protected readyAnchor(): Locator {
    return this.page.locator(".team-grid:not([aria-busy='true']), .empty");
  }

  /** The month title, e.g. "November 2026". */
  title(): Locator {
    return this.main.locator(".period-nav h1");
  }

  previousMonth(): Locator {
    return this.main.getByRole("button", { name: "Previous month", exact: true });
  }

  nextMonth(): Locator {
    return this.main.getByRole("button", { name: "Next month", exact: true });
  }

  today(): Locator {
    return control(this.main, "Today");
  }

  legendItems(): Locator {
    return this.main.getByRole("list", { name: "Legend" }).locator(".legend__item");
  }

  /** The sheet: a grid labelled "Time off, {Month yyyy}". */
  grid(): Locator {
    return this.main.getByRole("grid");
  }

  /** Column headers in order: "Team member", one per day ("Mon 2 Nov"), "Left". */
  columnHeaders(): Locator {
    return this.grid().getByRole("columnheader");
  }

  /** The day column header with the accessible name `day`, e.g. "Mon 2 Nov". */
  dayHeader(day: string): Locator {
    return this.grid().getByRole("columnheader", { name: day, exact: true });
  }

  /** Member names down the side, in row order (the Out row excluded). */
  memberNames(): Locator {
    return this.grid().locator(".grid-name:not(.grid-name--cover) :is(a, .grid-name__text)");
  }

  /** The row header of the member marked as the signed-in person. */
  youRow(): Locator {
    return this.grid().locator(".grid-name").filter({ has: this.page.locator(".grid-name__you") });
  }

  /** The cell whose accessible name starts with "{member}, {day}:", e.g. ("Ana Ruiz", "Wed 4 Nov"). */
  cell(member: string, day: string): Locator {
    return this.grid().locator(".cell").and(this.page.locator(`[aria-label^="${member}, ${day}: "]`));
  }

  /** A member's figure in the Left column. */
  daysLeft(member: string): Locator {
    return this.grid()
      .getByRole("row")
      .filter({ has: this.page.getByRole("rowheader", { name: member }) })
      .locator(".grid-left");
  }

  /** The glyph a cell draws over its colour ("✓", "…", "?"; empty for working and red days). */
  async glyphOf(cell: Locator): Promise<string> {
    return cell.evaluate((el) => getComputedStyle(el, "::after").content.replace(/^"|"$/g, "").replace(/^none$/, ""));
  }

  /** The Out row's cells that carry a count, in day order. */
  outCells(): Locator {
    return this.grid().locator(".cover");
  }

  /**
   * The Out row's count under the day `day` ("Wed 4 Nov"); matches nothing under a day nobody
   * works. The Out row (the last row) has the header row's columns, so the cell is found by the
   * day's column position.
   */
  async outCell(day: string): Promise<Locator> {
    const labels = await this.grid()
      .getByRole("row")
      .first()
      .getByRole("columnheader")
      .evaluateAll((headers) => headers.map((h) => h.getAttribute("aria-label")));
    const column = labels.indexOf(day);
    if (column < 1) throw new Error(`No day column "${day}".`);
    return this.grid().getByRole("row").last().getByRole("gridcell").nth(column - 1).locator(".cover");
  }

  /** Placeholder rows shown while the month loads. */
  placeholderCells(): Locator {
    return this.grid().locator(".cell.skeleton");
  }

  emptyState(): Locator {
    return this.main.locator(".empty:not(.empty--error)");
  }

  errorState(): Locator {
    return this.main.locator(".empty--error");
  }

  /** A button or link inside the empty or error state, by its label. */
  stateAction(name: string): Locator {
    return control(this.main.locator(".empty"), name);
  }
}
