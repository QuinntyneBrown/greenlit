import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * Requests: `/requests` in the app, pages/requests/*.html in the mocks. Journey 8 builds the
 * manager's pending list far enough to approve from it (docs/detailed-designs/requests/approve-request);
 * the tabs, selection and bulk approve are journey 9.
 */
export class RequestsPage extends BasePage {
  readonly slug: PageSlug = "requests";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.rows().or(this.main.locator(".empty-state, .alert"));
  }

  heading(): Locator {
    return this.main.getByRole("heading", { level: 1, name: "Requests", exact: true });
  }

  /** Every request in the list. */
  rows(): Locator {
    return this.main.locator("li.request-row");
  }

  /** The row of a member's request. */
  row(member: string): Locator {
    return this.rows().filter({ has: this.page.locator(".request-row__title", { hasText: new RegExp(`^${member}$`) }) });
  }

  /** "16–20 Nov · 5 days" under the name. */
  summary(member: string): Locator {
    return this.row(member).locator(".request-row__sub");
  }

  note(member: string): Locator {
    return this.row(member).locator(".request-row__note");
  }

  /** The row's Approve button; it reads "Approving…" with `aria-busy` while the decision is recorded. */
  approve(member: string): Locator {
    return this.row(member).locator(".btn--approve");
  }

  /** The name button that opens the request's detail. */
  open(member: string): Locator {
    return this.row(member).locator(".request-row__who");
  }

  /** The empty state shown when the list cannot be loaded. */
  loadError(): Locator {
    return this.main.locator(".empty-state--error");
  }

  // ---- toasts (shared with the calendar) ----

  toasts(): Locator {
    return this.page.locator(".toast");
  }

  toast(title: string): Locator {
    return this.toasts().filter({ has: this.page.locator(".toast__title", { hasText: title }) });
  }

  toastText(title: string): Locator {
    return this.toast(title).locator(".toast__text");
  }

  toastAction(title: string, name: string): Locator {
    return this.toast(title).getByRole("button", { name, exact: true });
  }
}
