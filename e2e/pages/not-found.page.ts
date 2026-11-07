import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/** The not-found error page: any unknown address in the app, pages/not-found/default.html in the mocks. */
export class NotFoundPage extends BasePage {
  readonly slug: PageSlug = "not-found";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.title();
  }

  title(): Locator {
    return this.main.locator(".empty__title");
  }

  message(): Locator {
    return this.main.locator(".empty__text");
  }

  backToCalendar(): Locator {
    return this.main.locator(".empty__actions").getByRole("link", { name: "Back to calendar", exact: true });
  }

  async goBackToCalendar(): Promise<void> {
    await this.backToCalendar().click();
  }
}
