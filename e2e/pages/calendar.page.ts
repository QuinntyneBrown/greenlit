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
    return this.page.locator(".team-grid:not([aria-busy='true']), .week-strip:not([aria-busy='true']), .empty");
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

  /** The legend list, for the visual comparison. */
  legend(): Locator {
    return this.main.getByRole("list", { name: "Legend" });
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

  // ---- the keyboard on the sheet (docs/detailed-designs/sheet/select-days) ----

  /** The cells that are a tab stop: the sheet has exactly one (roving focus). */
  tabStops(): Locator {
    return this.grid().locator('.cell[tabindex="0"]');
  }

  /** The cell that has keyboard focus. */
  focusedCell(): Locator {
    return this.grid().locator(".cell:focus");
  }

  /** Puts keyboard focus on a cell, as Tab would land there. */
  async focusCell(member: string, day: string): Promise<void> {
    await this.cell(member, day).focus();
  }

  /** Presses a key (or chord such as "Shift+ArrowRight") with focus where it is. */
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  // ---- selecting days (docs/detailed-designs/sheet/select-days) ----

  /**
   * Selects `member`'s cells from day `from` to day `to` in Select mode: a click when they are
   * the same, otherwise a drag with the mouse or a finger.
   */
  async select(member: string, from: string, to: string = from): Promise<void> {
    await this.paint(member, from, to);
  }

  /** The cells that are selected (`aria-pressed="true"`). */
  selectedCells(): Locator {
    return this.grid().locator('.cell[aria-pressed="true"]');
  }

  /** The selection bar: a toolbar labelled "Selected days". */
  selectionBar(): Locator {
    return this.page.getByRole("toolbar", { name: "Selected days", exact: true });
  }

  /** "{member} · {range}", e.g. "Ana Ruiz · 23–25 Nov". */
  selectionTitle(): Locator {
    return this.selectionBar().locator(".selection-bar__title");
  }

  /** The line under the title: "3 days working" and, over the allowance, "2 days over allowance". */
  selectionMeta(): Locator {
    return this.selectionBar().locator(".selection-bar__meta");
  }

  /** The bar's buttons in order: Confirm (manager only), Request, Tentative, Clear, Clear selection. */
  selectionActions(): Locator {
    return this.selectionBar().getByRole("button");
  }

  selectionAction(name: string): Locator {
    return this.selectionBar().getByRole("button", { name, exact: true });
  }

  /** The selection bar's button that has keyboard focus. */
  focusedAction(): Locator {
    return this.selectionBar().locator("button:focus");
  }

  /**
   * Gets keyboard focus onto the cell for `member` and `day` using only keys: Tab from the top of the page
   * into the sheet, then the arrow keys and Home.
   */
  async keyboardTo(member: string, day: string): Promise<void> {
    await this.page.locator("body").press("Tab");
    for (let i = 0; i < 40 && (await this.focusedCell().count()) === 0; i++) await this.press("Tab");
    const nameOfFocused = async (): Promise<string> => (await this.focusedCell().getAttribute("aria-label")) ?? "";
    for (let i = 0; i < 12 && !(await nameOfFocused()).startsWith(`${member}, `); i++) await this.press("ArrowDown");
    await this.press("Home");
    for (let i = 0; i < 40 && !(await nameOfFocused()).startsWith(`${member}, ${day}: `); i++) await this.press("ArrowRight");
  }

  /** The polite status that says how many days are selected ("3 days selected"). */
  selectionAnnouncement(): Locator {
    return this.main.getByRole("status");
  }

  // ---- the calendar on a phone (docs/detailed-designs/sheet/phone-week) ----

  /** The week tabs: a tab list labelled "Week". */
  weekTabList(): Locator {
    return this.main.getByRole("tablist", { name: "Week", exact: true });
  }

  /** The week tabs in order, named by their days in the month ("1", "2–8", …). */
  weekTabs(): Locator {
    return this.weekTabList().getByRole("tab");
  }

  /** The week tab whose days are `days`, e.g. "23–29". */
  weekTab(days: string): Locator {
    // A tab that holds a short day is also named by its marker ("23–29 Short of people this week").
    return this.weekTabList().getByRole("tab", { name: new RegExp(`^${days}( |$)`) });
  }

  /** The selected week tab. */
  selectedWeekTab(): Locator {
    return this.weekTabList().getByRole("tab", { selected: true });
  }

  /** The marker on a week tab that holds a short day. */
  shortWeekMarker(days: string): Locator {
    return this.weekTab(days).getByRole("img", { name: "Short of people this week", exact: true });
  }

  /** Shows the week whose days are `days` ("23–29"). */
  async showWeek(days: string): Promise<void> {
    await this.weekTab(days).click();
  }

  /** The week card, labelled "Week of {days} {Mon}". */
  weekCard(): Locator {
    return this.main.locator(".week-strip");
  }

  /** The week card's date buttons, Monday to Sunday (placeholders outside the month included). */
  weekDates(): Locator {
    return this.weekCard().locator(".week-strip__date");
  }

  /** The date button for `day` ("Thu 26 Nov"). */
  weekDate(day: string): Locator {
    return this.weekCard().getByRole("button", { name: `See who is out ${day}`, exact: true });
  }

  /** Member names down the week card, in row order. */
  weekMemberNames(): Locator {
    return this.weekCard().locator(".week-strip__name");
  }

  /** The week card row of `member`. */
  weekRow(member: string): Locator {
    return this.weekCard()
      .locator(".week-strip__rows > li")
      .filter({ has: this.page.locator(".week-strip__name", { hasText: member }) });
  }

  /** A member's days left in the week card ("11 left"). */
  weekDaysLeft(member: string): Locator {
    return this.weekRow(member).locator(".week-strip__left");
  }

  /** The "You" mark in the week card. */
  weekYou(): Locator {
    return this.weekCard().locator(".week-strip__you");
  }

  /** The "You" mark on `member`'s row of the week card. */
  weekYouOf(member: string): Locator {
    return this.weekRow(member).locator(".week-strip__you");
  }

  /** The week card's cell for `member` on `day` ("Ana Ruiz", "Mon 23 Nov"). */
  weekCell(member: string, day: string): Locator {
    return this.weekCard().locator(".cell").and(this.page.locator(`[aria-label^="${member}, ${day}: "]`));
  }

  /** Blank placeholders for days of the week outside the month. */
  weekBlanks(): Locator {
    return this.weekCard().locator(".week-strip__blank");
  }

  /** The Out count under `day` ("Wed 18 Nov") in the week card, found by the day's column. */
  async weekOutCell(day: string): Promise<Locator> {
    return this.weekCard().locator(".week-strip__out > *").nth(await this.weekColumn(day)).locator(".cover");
  }

  /** The card "Days short of people" above the week tabs. */
  shortDaysCard(): Locator {
    return this.main.getByRole("region", { name: "Days short of people", exact: true });
  }

  /** The card's heading, e.g. "Below the minimum of 4 once in November". */
  shortDaysHeading(): Locator {
    return this.shortDaysCard().getByRole("heading");
  }

  /** The runs of short days, in date order. */
  shortRuns(): Locator {
    return this.shortDaysCard().locator(".short-days__run");
  }

  /** The run whose dates are `dates` ("Tue 24 – Thu 26 Nov"). */
  shortRun(dates: string): Locator {
    return this.shortRuns().filter({ has: this.page.locator(".short-days__dates", { hasText: dates }) });
  }

  /** Who is out in a run, each with their status in words ("Ben · tentative"). */
  shortRunWho(dates: string): Locator {
    return this.shortRun(dates).locator(".short-days__who > span");
  }

  /** The week card's band behind the column of `day` ("Tue 24 Nov"), found by the day's column. */
  async weekBand(day: string): Promise<Locator> {
    return this.weekCard().locator(".week-strip__band").nth(await this.weekColumn(day));
  }

  /** The index (Monday 0) of `day`'s column in the week shown. */
  private async weekColumn(day: string): Promise<number> {
    await this.weekDate(day).waitFor();
    const labels = await this.weekDates().evaluateAll((dates) => dates.map((d) => d.getAttribute("aria-label")));
    const column = labels.indexOf(`See who is out ${day}`);
    if (column < 0) throw new Error(`No date "${day}" in the week shown.`);
    return column;
  }

  /** Opens or closes the panel of `day` ("Thu 26 Nov") by pressing its date. */
  async openDay(day: string): Promise<void> {
    await this.weekDate(day).click();
  }

  /** The panel of an open date, labelled "Out on 26 Nov". */
  dayPanel(): Locator {
    return this.main.getByRole("region", { name: /^Out on / });
  }

  /** The open date's heading, e.g. "Thu 26 Nov". */
  dayPanelHeading(): Locator {
    return this.dayPanel().getByRole("heading");
  }

  /** Each member's name in the day panel, in row order. */
  dayPanelNames(): Locator {
    return this.dayPanel().locator(".day-panel__name");
  }

  /** `member`'s status in words in the day panel ("Confirmed", "Working", …). */
  dayPanelState(member: string): Locator {
    return this.dayPanel()
      .locator(".day-panel__row")
      .filter({ has: this.page.locator(".day-panel__name", { hasText: member }) })
      .locator(".day-panel__state");
  }

  /** The one line a weekend or holiday shows instead of the members ("Christmas Day · not a working day"). */
  dayPanelNote(): Locator {
    return this.dayPanel().locator(".day-panel__off");
  }

  /** The day panel's "Close day" button. */
  closeDay(): Locator {
    return this.dayPanel().getByRole("button", { name: "Close day", exact: true });
  }

  /** Taps `member`'s cell on `day` ("Mon 23 Nov") in the week shown. */
  async tapCell(member: string, day: string): Promise<void> {
    await this.weekCell(member, day).click();
  }

  /** The week card's cells that show as selected. */
  weekSelectedCells(): Locator {
    return this.weekCard().locator('.cell[aria-pressed="true"]');
  }

  /** The non-modal panel "Selected days" at the foot of the screen. */
  markSheet(): Locator {
    return this.page.getByRole("region", { name: "Selected days", exact: true });
  }

  /** The member the marked days are for. */
  markSheetWho(): Locator {
    return this.markSheet().locator(".mark-sheet__who");
  }

  /** "From Mon 23 Nov" while picking, then the range ("Mon 23 – Thu 26 Nov"). */
  markSheetRange(): Locator {
    return this.markSheet().getByRole("heading");
  }

  /** "Now tap the last day. …" while picking, then the working days ("4 working days"). */
  markSheetMeta(): Locator {
    return this.markSheet().locator(".mark-sheet__meta");
  }

  /** The overage of L2-016 AC5 ("2 days over allowance"). */
  markSheetWarning(): Locator {
    return this.markSheet().locator(".mark-sheet__warn");
  }

  /** Who else is out on the range's days. */
  markSheetClash(): Locator {
    return this.markSheet().locator(".mark-sheet__clash");
  }

  /** A button of the mark sheet by its name ("Just this day", "Request these days", "Cancel", …). */
  markSheetAction(name: string): Locator {
    return this.markSheet().getByRole("button", { name, exact: true });
  }

  /** The mark sheet's actions under the range, in order (Cancel, an icon button, is found by name). */
  markSheetActions(): Locator {
    return this.markSheet().locator(".mark-sheet__actions").getByRole("button");
  }

  /** The hint at the foot of the screen while nothing is selected. */
  phoneHint(): Locator {
    return this.page.locator(".phone-hint");
  }

  /** Every legend on the page (the phone shows one). */
  legends(): Locator {
    return this.main.getByRole("list", { name: "Legend", exact: true });
  }

  /** The line under the phone's legend naming the shown week's holidays. */
  holidayNote(): Locator {
    return this.main.locator(".phone-legend__note");
  }

  /**
   * Presses Tab until `target` has focus, at most `limit` times; true when it got there. Proves a control is in the
   * tab order without pinning how many stops come before it.
   */
  async tabTo(target: Locator, limit = 80): Promise<boolean> {
    for (let i = 0; i < limit; i++) {
      await this.page.keyboard.press("Tab");
      if (await target.evaluate((el) => el === document.activeElement)) return true;
    }
    return false;
  }

  /** Waits for the week's rows: the mocks stamp no `data-page`, so a capture of either waits on content. */
  async waitForWeek(): Promise<void> {
    await this.weekCard().locator(".week-strip__cells").first().waitFor();
  }

  /** The legend under the week, with its holiday line (L2-063 AC13). */
  phoneLegend(): Locator {
    return this.main.locator(".phone-legend");
  }

  /**
   * Hides the days-left figure of every row on the week, keeping its place: the mocks' figures are illustrative
   * (docs/mocks/README.md, note 11), and a mask would follow each figure's width, which differs.
   */
  async hideLeftFigures(): Promise<void> {
    await this.weekCard()
      .locator(".week-strip__left")
      .evaluateAll((els) => els.forEach((el) => ((el as HTMLElement).style.visibility = "hidden")));
  }

  /** Hides the fixed foot hint, which covers the foot of the week in a capture of the whole card. */
  async hidePhoneHint(): Promise<void> {
    await this.phoneHint().evaluate((el: HTMLElement) => (el.style.visibility = "hidden"));
  }

  /** Back to the top of the page, so the sticky header covers nothing being captured. */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /** The mark sheet's panel itself, without the fixed region around it. */
  markSheetPanel(): Locator {
    return this.page.locator(".mark-sheet");
  }

  /** Moves `region` onto whole pixels, so a capture of the mock and of the app line up. */
  async alignToPixelGrid(region: Locator): Promise<void> {
    await region.evaluate((el: HTMLElement) => {
      const box = el.getBoundingClientRect();
      const top = box.top + window.scrollY;
      const left = box.left + window.scrollX;
      el.style.position = el.style.position || "relative";
      el.style.top = `${Math.ceil(top) - top}px`;
      el.style.left = `${Math.ceil(left) - left}px`;
    });
  }

  /** Whether the page scrolls sideways. */
  async scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
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

  /** The body text of the toast whose title is `title`. */
  toastText(title: string): Locator {
    return this.toast(title).locator(".toast__text");
  }

  /** The toast's action button ("Undo", "Try again") or its Dismiss button. */
  toastAction(title: string, name: string): Locator {
    return this.toast(title).getByRole("button", { name, exact: true });
  }

  /** The toast's Dismiss button. */
  toastDismiss(title: string): Locator {
    return this.toast(title).getByRole("button", { name: "Dismiss", exact: true });
  }

  /** Moves the pointer onto the toast, or away from every toast. */
  async hoverToast(title: string): Promise<void> {
    await this.toast(title).hover();
  }

  async leaveToasts(): Promise<void> {
    await this.page.mouse.move(1, 1);
  }

  /** Takes keyboard focus out of the toast (back to the page). */
  async blurToast(): Promise<void> {
    await this.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  }

  /** The live region that announces the toast: "polite" or "assertive". */
  toastAnnouncedAs(title: string): Locator {
    return this.page.locator("[aria-live]").filter({ has: this.toast(title) });
  }

  /** Scrolls the cell to the foot of the viewport and gives it keyboard focus, where a toast would sit. */
  async focusCellAtViewportFoot(member: string, day: string): Promise<void> {
    const cell = this.cell(member, day);
    await cell.evaluate((el) => el.scrollIntoView({ block: "end" }));
    await cell.focus();
  }

  /** Whether the focused element lies under any toast on screen. */
  async focusIsCoveredByToast(): Promise<boolean> {
    return this.page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return false;
      const f = focused.getBoundingClientRect();
      return [...document.querySelectorAll(".toast")].some((t) => {
        const r = t.getBoundingClientRect();
        return f.left < r.right && f.right > r.left && f.top < r.bottom && f.bottom > r.top;
      });
    });
  }
}
