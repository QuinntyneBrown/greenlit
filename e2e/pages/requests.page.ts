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
    return this.rows().or(this.main.locator(".empty, .alert, section[aria-label='Upcoming']"));
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

  /** The row's Decline button, which opens the Decline request dialog. */
  decline(member: string): Locator {
    return this.row(member).getByRole("button", { name: "Decline", exact: true });
  }

  /** The name button that opens the request's detail. */
  open(member: string, summary?: string): Locator {
    const row = summary ? this.row(member).filter({ hasText: summary }) : this.row(member);
    return row.locator(".request-row__who");
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

  // ---- My requests (a member) ----

  /** "My requests", the member's title. */
  mineHeading(): Locator {
    return this.main.getByRole("heading", { level: 1, name: "My requests", exact: true });
  }

  /** "You can also request days straight from the calendar." */
  mineIntro(): Locator {
    return this.main.locator(".page-title-row p");
  }

  /** The "New request" button, which opens the Request time off dialog. */
  newRequest(): Locator {
    return this.main.getByRole("button", { name: "New request", exact: true });
  }

  /** One of the two groups, "Upcoming" or "Past". */
  group(name: "Upcoming" | "Past"): Locator {
    return this.main.locator(`section[aria-label='${name}']`);
  }

  /** The requests in a group. */
  mine(group: "Upcoming" | "Past"): Locator {
    return this.group(group).locator("li.request-row");
  }

  /** A member's own request in a group, found by its title, "16–20 Nov · 5 days". */
  myRequest(group: "Upcoming" | "Past", summary: string): Locator {
    return this.mine(group).filter({ has: this.page.locator(".request-row__title", { hasText: summary }) });
  }

  /** The title of a request in My requests: its range and days. */
  mySummary(row: Locator): Locator {
    return row.locator(".request-row__title");
  }

  /** "Sent 3 Nov" under the title. */
  mySent(row: Locator): Locator {
    return row.locator(".request-row__sub");
  }

  /** The row's "Cancel request" button; only a pending request has one. */
  cancelRequest(row: Locator): Locator {
    return row.getByRole("button", { name: "Cancel request", exact: true });
  }

  /** The text shown in a group with nothing in it ("Nothing planned yet."). */
  groupEmpty(group: "Upcoming" | "Past"): Locator {
    return this.group(group).locator("p.text-muted");
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
