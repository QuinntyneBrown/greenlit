import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/** The offline page: a page opened while Greenlit is offline and has nothing loaded, pages/offline/default.html in the mocks. */
export class OfflinePage extends BasePage {
  readonly slug: PageSlug = "offline";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.title();
  }

  title(): Locator {
    return this.main.locator(".empty__title");
  }

  /** The line under the title. */
  message(): Locator {
    return this.main.locator(".empty__text");
  }

  tryAgain(): Locator {
    return control(this.main.locator(".empty__actions"), "Try again");
  }
}
