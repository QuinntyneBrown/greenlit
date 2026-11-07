import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/** The three tabs of the ledger. */
export type RequestTab = "Pending" | "Approved" | "Declined";

/**
 * Requests: `/requests` in the app, pages/requests/*.html in the mocks. The manager's ledger by status
 * with overlaps and bulk approve (docs/detailed-designs/requests/review-requests), and the decisions
 * made from it (docs/detailed-designs/requests/approve-request).
 */
export class RequestsPage extends BasePage {
  readonly slug: PageSlug = "requests";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.rows().or(this.main.locator(".empty, .alert"));
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
    return this.main.locator(".empty--error");
  }

  /** The empty state of a tab with nothing in it. */
  empty(): Locator {
    return this.main.locator(".empty:not(.empty--error)");
  }

  /** Placeholders shown while the requests load. */
  loading(): Locator {
    return this.main.locator("[aria-busy='true']");
  }

  // ---- tabs ----

  /** The status tabs, in order. */
  tabs(): Locator {
    return this.main.getByRole("tab");
  }

  /** A tab; its name is the status and its count, "Pending 4". */
  tab(name: RequestTab): Locator {
    return this.main.getByRole("tab", { name: new RegExp(`^${name}\\b`) });
  }

  async openTab(name: RequestTab): Promise<void> {
    await this.tab(name).click();
  }

  // ---- what a row says ----

  /** The lines under the note: who else is out, "No overlaps", "Sent 28 Sep · decided 29 Sep" or "Reason: ...". */
  meta(member: string): Locator {
    return this.row(member).locator(".request-row__meta");
  }

  /** The status shown in place of Approve once a request is decided. */
  status(member: string): Locator {
    return this.row(member).locator(".req-status");
  }

  // ---- selection and bulk approve ----

  /** The checkbox "Select {name}'s request". */
  select(member: string): Locator {
    return this.row(member).getByRole("checkbox", { name: `Select ${member}'s request`, exact: true });
  }

  selectAll(): Locator {
    return this.main.getByRole("checkbox", { name: "Select all pending requests", exact: true });
  }

  /** The toolbar's button: "Approve" with nothing ticked, "Approve 3" with three. */
  approveSelected(): Locator {
    return this.main.locator(".toolbar-row .btn--approve");
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
