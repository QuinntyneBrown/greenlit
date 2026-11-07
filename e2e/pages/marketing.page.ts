import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The marketing page (L2-050): the marketing site's `/` in the app,
 * pages/marketing/default.html in the mocks. Locators follow the mock's `mk-*`
 * classes and accessible names.
 */
export class MarketingPage extends BasePage {
  readonly slug: PageSlug = "marketing";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.heroTitle();
  }

  // Header

  header(): Locator {
    return this.page.locator("header.mk-header");
  }

  /** The logo: a link back to the top labelled "Greenlit, back to the top". */
  override logo(): Locator {
    return this.header().getByRole("link", {
      name: "Greenlit, back to the top",
      exact: true,
    });
  }

  sectionNav(): Locator {
    return this.page.getByRole("navigation", {
      name: "Page sections",
      exact: true,
    });
  }

  sectionNavLinks(): Locator {
    return this.sectionNav().getByRole("link");
  }

  openApp(): Locator {
    return this.header().getByRole("link", {
      name: "Open the app",
      exact: true,
    });
  }

  // Hero

  hero(): Locator {
    return this.page.locator("section#top");
  }

  heroTitle(): Locator {
    return this.hero().getByRole("heading", { level: 1 });
  }

  heroLead(): Locator {
    return this.hero().locator(".mk-lead");
  }

  heroCreateTeam(): Locator {
    return this.hero().getByRole("link", {
      name: "Create your team",
      exact: true,
    });
  }

  heroSeeHow(): Locator {
    return this.hero().getByRole("link", {
      name: "See how it works ↓",
      exact: true,
    });
  }

  heroTrust(): Locator {
    return this.hero().locator(".mk-trust");
  }

  sheet(): Locator {
    return this.hero().locator(".mk-sheet");
  }

  sheetRowNames(): Locator {
    return this.sheet().locator(".mk-sheet__name");
  }

  sheetDayHeads(): Locator {
    return this.sheet().locator(".mk-sheet__head");
  }

  sheetOffDayHeads(): Locator {
    return this.sheet().locator(".mk-sheet__head[data-off]");
  }

  sheetCells(): Locator {
    return this.sheet().locator(".mk-sheet__grid .cell");
  }

  sheetCellsWithStatus(status: string): Locator {
    return this.sheet().locator(
      `.mk-sheet__grid .cell[data-status="${status}"]`,
    );
  }

  sheetLegendItems(): Locator {
    return this.sheet().locator(".mk-sheet__legend > span");
  }
}
