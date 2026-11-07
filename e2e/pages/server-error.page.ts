import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/** The server-error page: a page that failed on our side, pages/server-error/default.html in the mocks. */
export class ServerErrorPage extends BasePage {
  readonly slug: PageSlug = "server-error";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.title();
  }

  title(): Locator {
    return this.main.locator(".empty__title");
  }

  /** The line under the title, including "Error reference {ref}.". */
  message(): Locator {
    return this.main.locator(".empty__text");
  }

  tryAgain(): Locator {
    return control(this.main.locator(".empty__actions"), "Try again");
  }

  backToCalendar(): Locator {
    return control(this.main.locator(".empty__actions"), "Back to calendar");
  }
}
