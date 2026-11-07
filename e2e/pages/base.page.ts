/**
 * Shared chrome present on every Greenlit screen.
 *
 * Locators follow the mock DOM contract (`docs/mocks/styles` BEM classes,
 * `aria-current`, `aria-pressed`, roles + accessible names). The Angular
 * components render exactly the same classes on their host / inner elements,
 * so one locator set serves both the baseline capture (mocks) and the verify
 * / behaviour runs (app). Tests state intent; page objects know the DOM.
 * Never put a selector in a test.
 */

import { Locator, Page } from "@playwright/test";
import { PageSlug } from "../fixtures/routes.js";

/** A control that may be an `<a>` (mocks, links) or a `<button>` (app). */
export function control(scope: Locator | Page, name: string | RegExp): Locator {
  return scope
    .getByRole("button", { name, exact: typeof name === "string" })
    .or(scope.getByRole("link", { name, exact: typeof name === "string" }));
}

export abstract class BasePage {
  /** `body[data-page]` this screen stamps. */
  abstract readonly slug: PageSlug;

  constructor(protected readonly page: Page) {}

  /** The element whose presence means the screen has rendered its content. */
  protected abstract readyAnchor(): Locator;

  /**
   * Waits for `body[data-page="<slug>"]` (route data in the app, a static
   * attribute in the mocks) and then for the page's own anchor element.
   */
  async waitForReady(slug: PageSlug = this.slug): Promise<void> {
    await this.page.waitForSelector(`body[data-page="${slug}"]`, {
      state: "attached",
      timeout: 10_000,
    });
    await this.readyAnchor().first().waitFor({ state: "attached", timeout: 10_000 });
  }

  get body(): Locator {
    return this.page.locator("body");
  }

  /** `<main id="main" class="gl-frame">` in the app; `main#main` in the mocks. */
  get main(): Locator {
    return this.page.locator("main#main");
  }

  skipLink(): Locator {
    return this.page.locator("a.skip-link");
  }

  /** The Greenlit logo in the top bar: a link home labelled "Greenlit, team calendar". */
  logo(): Locator {
    return this.page.locator("header.topbar").getByRole("link", { name: "Greenlit, team calendar", exact: true });
  }

  /** The navigation labelled "Main" in the top bar. */
  mainNav(): Locator {
    return this.page.getByRole("navigation", { name: "Main", exact: true });
  }

  /** The links of the main navigation, in document order. */
  mainNavLinks(): Locator {
    return this.mainNav().locator("a.app-nav__link");
  }

  /** The main-navigation link whose visible label starts with `label`. */
  mainNavLink(label: string): Locator {
    return this.mainNav().getByRole("link", { name: new RegExp(`^${label}\\b`) });
  }

  async openFromMainNav(label: string): Promise<void> {
    await this.mainNavLink(label).click();
  }
}
