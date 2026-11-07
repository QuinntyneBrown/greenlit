import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/** The forbidden page: a manager-only page opened by someone who is not the manager, pages/forbidden/default.html in the mocks. */
export class ForbiddenPage extends BasePage {
  readonly slug: PageSlug = "forbidden";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.title();
  }

  title(): Locator {
    return this.main.locator(".empty__title");
  }

  /** The line under the title: who to ask. */
  message(): Locator {
    return this.main.locator(".empty__text");
  }

  backToCalendar(): Locator {
    return control(this.main.locator(".empty__actions"), "Back to calendar");
  }
}
