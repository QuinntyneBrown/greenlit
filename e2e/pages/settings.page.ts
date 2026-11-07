import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * Settings: `/settings` in the app, pages/settings/*.html in the mocks
 * (docs/detailed-designs/teams/invite-member builds its Team section; the rest is journey 18).
 */
export class SettingsPage extends BasePage {
  readonly slug: PageSlug = "settings";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.teamSection().locator(".member-list, .alert");
  }

  heading(): Locator {
    return this.main.getByRole("heading", { level: 1, name: "Settings", exact: true });
  }

  teamSection(): Locator {
    return this.main.locator("section#team");
  }

  /** The names in the team's member list, in order. */
  memberNames(): Locator {
    return this.teamSection().locator(".member-list__who > :first-child");
  }

  inviteButton(): Locator {
    return control(this.teamSection(), "Invite a member");
  }

  /** The read-only note a member sees instead of the controls (L2-009 AC3). */
  readOnlyNote(): Locator {
    return this.teamSection().getByText("Only managers can change team settings.");
  }

  async openInviteDialog(): Promise<void> {
    await this.inviteButton().click();
  }

  // --- Work week & holidays (docs/detailed-designs/teams/manage-holidays) -------------------------

  workWeekSection(): Locator {
    return this.main.locator('section#work-week');
  }

  /** The section has rendered its holidays or its empty or error state. */
  async waitForHolidays(): Promise<void> {
    await this.workWeekSection().locator('.holiday-row, .empty').first().waitFor({ state: 'attached', timeout: 10_000 });
  }

  /** "Non-working days and holidays show red on the calendar and never count against allowance." */
  workWeekIntro(): Locator {
    return this.workWeekSection().locator('> p');
  }

  /** The seven working-day chips, Mon to Sun. */
  workingDays(): Locator {
    return this.workWeekSection().getByRole('group', { name: 'Working days', exact: true }).locator('.chip--day');
  }

  /** The chip for `day` ("Fri") in the Working days group. */
  workingDay(day: string): Locator {
    return this.workingDays().filter({ hasText: day });
  }

  /** The work-week section's "Save changes"; it reads "Saving…" while busy. */
  saveWorkWeekButton(): Locator {
    return this.workWeekSection().locator(".settings-actions .btn--primary");
  }

  /** The polite status next to "Save changes": "Saved" after a save. */
  saveWorkWeekStatus(): Locator {
    return this.workWeekSection().locator(".settings-actions [aria-live='polite']");
  }

  /** The hint under the chips when none is on: "Pick at least one working day." */
  workingDaysError(): Locator {
    return this.workWeekSection().locator(".field__error");
  }

  /** "Public holidays: United Kingdom" */
  holidaySource(): Locator {
    return this.workWeekSection().locator('.text-caption');
  }

  holidayRows(): Locator {
    return this.workWeekSection().locator('.holiday-row');
  }

  /** The date of the holiday named `name`, e.g. "Thu 1 Jan". */
  holidayDate(name: string): Locator {
    return this.holidayRows().filter({ hasText: name }).locator('.holiday-row__date');
  }

  removeHolidayButton(name: string): Locator {
    return this.workWeekSection().getByRole('button', { name: `Remove ${name}`, exact: true });
  }

  addDayOffButton(): Locator {
    return control(this.workWeekSection(), 'Add day off');
  }

  workWeekHeading(): Locator {
    return this.workWeekSection().getByRole("heading", { level: 2, name: "Work week & holidays", exact: true });
  }

  /** The banner that says next year's public holidays are ready: "2027 UK bank holidays are ready". */
  reviewBanner(): Locator {
    return this.main.locator(".banner");
  }

  reviewBannerTitle(): Locator {
    return this.reviewBanner().locator(".alert__title");
  }

  reviewBannerText(): Locator {
    return this.reviewBanner().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  reviewHolidaysButton(): Locator {
    return control(this.reviewBanner(), "Review holidays");
  }

  dismissReviewBannerButton(): Locator {
    return this.reviewBanner().getByRole("button", { name: "Dismiss", exact: true });
  }

  async openAddHolidayDialog(): Promise<void> {
    await this.addDayOffButton().click();
  }

  /** Every toast on screen, newest first. */
  toasts(): Locator {
    return this.page.locator(".toast");
  }

  /** The toast whose title is `title`. */
  toast(title: string): Locator {
    return this.toasts().filter({ has: this.page.locator(".toast__title", { hasText: title }) });
  }

  toastText(title: string): Locator {
    return this.toast(title).locator(".toast__text");
  }

  toastAction(title: string, name: string): Locator {
    return this.toast(title).getByRole("button", { name, exact: true });
  }

  emptyTitle(): Locator {
    return this.workWeekSection().locator('.empty__title');
  }

  emptyText(): Locator {
    return this.workWeekSection().locator('.empty__text');
  }
}
