import { Locator, Page } from "@playwright/test";

/**
 * The connection banner at the top of every page: `.alert.banner` in the app shell,
 * notifications/offline-banner/* in the mocks (docs/detailed-designs/web-experience/connectivity).
 * Part of the chrome, not a screen, so it has no `data-page`.
 */
export class ConnectionBanner {
  constructor(private readonly page: Page) {}

  /** The banner; there is at most one. */
  banner(): Locator {
    return this.page.locator(".alert.banner");
  }

  /** "You’re offline", "Reconnecting…", ... */
  title(): Locator {
    return this.banner().locator(".alert__title");
  }

  /** The line under the title (the body text, without the title or the buttons). */
  text(): Locator {
    return this.banner().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  dismissButton(): Locator {
    return this.banner().getByRole("button", { name: "Dismiss", exact: true });
  }

  retryButton(): Locator {
    return this.banner().getByRole("button", { name: "Retry", exact: true });
  }

  /** Cuts the browser's connection, as when the network drops. */
  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true);
  }

  /** Restores the browser's connection. */
  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false);
  }
}
