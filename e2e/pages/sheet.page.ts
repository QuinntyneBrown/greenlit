import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/** The team's time-off sheet: pages/sheet.html in the mocks, `/sheet` in the app. */
export class SheetPage extends BasePage {
  readonly slug: PageSlug = "sheet";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.title();
  }

  title(): Locator {
    return this.main.getByRole("heading", { level: 1 });
  }
}
