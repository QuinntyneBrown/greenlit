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

  // Video

  watch(): Locator {
    return this.page.locator("section#watch");
  }

  watchTitle(): Locator {
    return this.watch().getByRole("heading", { level: 2 });
  }

  video(): Locator {
    return this.watch().locator("video");
  }

  captionTracks(): Locator {
    return this.video().locator("track[kind='captions']");
  }

  /** The mode of the first text track: "disabled" until the viewer turns captions on. */
  async captionMode(): Promise<string | undefined> {
    return this.video().evaluate(
      (v: HTMLVideoElement) => v.textTracks[0]?.mode,
    );
  }

  // Why, how, screens

  section(id: "why" | "how" | "screens" | "managers" | "start"): Locator {
    return this.page.locator(`section#${id}`);
  }

  sectionTitle(id: "why" | "how" | "screens" | "managers" | "start"): Locator {
    return this.section(id).getByRole("heading", { level: 2 });
  }

  cardTitles(id: "why" | "how"): Locator {
    return this.section(id).locator(".mk-card h3");
  }

  stepLabels(): Locator {
    return this.section("how").locator(".mk-card .mk-step__n");
  }

  whyCreateTeam(): Locator {
    return this.section("why").getByRole("link", {
      name: "Create your team",
      exact: true,
    });
  }

  screenshotTitles(): Locator {
    return this.section("screens").locator(".mk-shot h3");
  }

  screenshotImages(): Locator {
    return this.section("screens").locator(".mk-shot img");
  }

  // Managers, start, footer

  managerItems(): Locator {
    return this.section("managers").locator(".mk-list li strong");
  }

  startCreateTeam(): Locator {
    return this.section("start").getByRole("link", {
      name: "Create your team",
      exact: true,
    });
  }

  startSignIn(): Locator {
    return this.section("start").getByRole("link", {
      name: "Sign in",
      exact: true,
    });
  }

  footerNavLinks(): Locator {
    return this.page
      .getByRole("navigation", { name: "Footer", exact: true })
      .getByRole("link");
  }

  /** Whether the document is wider than the viewport (a phone must not scroll sideways). */
  async scrollsHorizontally(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
  }
}
