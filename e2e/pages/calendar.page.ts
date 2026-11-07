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

  // ---- marking days (docs/detailed-designs/sheet/mark-days) ----

  /** The paint picker: a radio group labelled "Paint". */
  paintPicker(): Locator {
    return this.main.getByRole("radiogroup", { name: "Paint", exact: true });
  }

  /** The names of the paint options, in order. */
  paintOptions(): Locator {
    return this.paintPicker().getByRole("radio");
  }

  paintOption(name: string): Locator {
    return this.paintPicker().getByRole("radio", { name, exact: true });
  }

  /** Chooses a paint colour: "Confirmed", "Requested", "Tentative" or "Clear". */
  async choosePaint(name: string): Promise<void> {
    await this.paintOption(name).click();
  }

  /** The line beside the legend that says how to paint. */
  hint(): Locator {
    return this.main.locator(".toolbar-row .text-caption");
  }

  /**
   * Drags across `member`'s cells from day `from` to day `to` ("Mon 23 Nov"), with the mouse on a
   * desktop and with a finger on a phone. `from` equal to `to` is a single press.
   */
  async paint(member: string, from: string, to: string = from): Promise<void> {
    const first = this.cell(member, from);
    const last = this.cell(member, to);
    // Bring the whole run into the part of the sheet the sticky name column does not cover.
    const lastHandle = (await last.elementHandle())!;
    await first.evaluate((a, b) => {
      const card = a.closest(".grid-card") as HTMLElement;
      const covered = card.querySelector(".grid-name")!.getBoundingClientRect().right + 4;
      const visibleRight = Math.min(card.getBoundingClientRect().right, window.innerWidth) - 4;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const low = Math.min(ra.left, rb.left);
      const high = Math.max(ra.right, rb.right);
      if (low < covered) card.scrollLeft -= covered - low;
      else if (high > visibleRight) card.scrollLeft += high - visibleRight;
    }, lastHandle);
    await first.scrollIntoViewIfNeeded();
    // Let the scroll and the paint colour's touch handling reach the compositor before a finger lands.
    await this.page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const a = (await first.boundingBox())!;
    const b = (await last.boundingBox())!;
    const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const touch = await this.page.evaluate(() => navigator.maxTouchPoints > 0);
    if (touch) {
      const cdp = await this.page.context().newCDPSession(this.page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      for (let i = 1; i <= 8; i++) {
        const x = start.x + ((end.x - start.x) * i) / 8;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: start.y }] });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
    } else {
      await this.page.mouse.move(start.x, start.y);
      await this.page.mouse.down();
      await this.page.mouse.move(end.x, end.y, { steps: 8 });
      await this.page.mouse.up();
    }
  }

  // ---- requesting time off (docs/detailed-designs/requests/send-request) ----

  /** The member's "Request time off" button beside the paint picker; the manager does not get one. */
  requestTimeOff(): Locator {
    return this.main.getByRole("button", { name: "Request time off", exact: true });
  }

  /** Every toast on screen, newest first. */
  toasts(): Locator {
    return this.page.locator(".toast");
  }

  /** The toast whose title is `title`. */
  toast(title: string): Locator {
    return this.toasts().filter({ has: this.page.locator(".toast__title", { hasText: title }) });
  }

  /** The toast's action button ("Undo", "Try again") or its Dismiss button. */
  toastAction(title: string, name: string): Locator {
    return this.toast(title).getByRole("button", { name, exact: true });
  }
}
