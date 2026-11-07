import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/** The team calendar, Greenlit's home screen: `/` in the app, pages/calendar/default.html in the mocks. */
export class CalendarPage extends BasePage {
  readonly slug: PageSlug = "calendar";

  constructor(page: Page) {
    super(page);
  }

  /** The calendar's own content arrives with journey 1; until then the main landmark is the anchor. */
  protected readyAnchor(): Locator {
    return this.main;
  }
}
