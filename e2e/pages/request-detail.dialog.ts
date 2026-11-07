import { Locator, Page } from "@playwright/test";

/**
 * The request detail drawer: opened from a request's name on the Requests page in the app,
 * dialogs/request-detail/*.html in the mocks (docs/detailed-designs/requests/approve-request).
 * Not a screen, so it has no `data-page`.
 */
export class RequestDetailDialog {
  constructor(private readonly page: Page) {}

  /** The open drawer, whoever's request it shows. */
  dialog(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.locator(".drawer") });
  }

  title(): Locator {
    return this.dialog().locator("#dlg-title");
  }

  /** "16–20 Nov · 5 days" */
  description(): Locator {
    return this.dialog().locator("#dlg-desc");
  }

  status(): Locator {
    return this.dialog().locator(".req-status");
  }

  sent(): Locator {
    return this.dialog().locator(".facts div", { hasText: "Sent" }).locator("dd");
  }

  note(): Locator {
    return this.dialog().locator(".quote");
  }

  /** "Decline reason: ..." on a declined request. */
  declineReason(): Locator {
    return this.dialog().locator(".decline-reason");
  }

  /** The scrolling part of the drawer, above the footer. */
  body(): Locator {
    return this.dialog().locator(".drawer__body");
  }

  /** The buttons in the footer: Approve while the request is pending, none after. */
  actions(): Locator {
    return this.dialog().locator(".drawer__footer .btn");
  }

  // ---- "Team those weeks" ----

  /** The grid of every member for the request's weeks. */
  team(): Locator {
    return this.dialog().getByRole("grid", { name: "Team those weeks", exact: true });
  }

  /** The day headings, e.g. "Mon 16 Nov". */
  days(): Locator {
    return this.team().locator("[role=columnheader][aria-label]");
  }

  /** The members' names down the side. */
  members(): Locator {
    return this.team().locator(".grid-name__text");
  }

  /** One member's cell on one day: its name carries the state, "Ana Ruiz, Mon 16 Nov: Requested". */
  cell(member: string, day: string): Locator {
    return this.team().getByRole("gridcell", { name: new RegExp(`^${member}, ${day}: `) });
  }

  /** The Out row's figure for a day: "2 out, 5 in". */
  out(index: number): Locator {
    return this.team().locator(".cover").nth(index);
  }

  /** The footer's Approve button: "Approving…" while busy, "Try approving again" after a failure. */
  approve(): Locator {
    return this.dialog().locator(".drawer__footer .btn--approve");
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  /** The danger alert after a failed decision. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger");
  }
}
