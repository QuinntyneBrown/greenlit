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
    return this.teamSection().locator(".member-list, .alert, .empty");
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

  /** "Everyone who appears on the calendar. Managers can approve requests and edit any row." */
  teamIntro(): Locator {
    return this.teamSection().locator("p").first();
  }

  teamNameField(): Locator {
    return this.teamSection().getByLabel("Team name", { exact: true });
  }

  timeZoneField(): Locator {
    return this.teamSection().getByLabel("Time zone", { exact: true });
  }

  /** The "Role for {name}" control of a member's row. */
  roleField(name: string): Locator {
    return this.teamSection().getByLabel(`Role for ${name}`, { exact: true });
  }

  /** The "Yearly days for {name}" field of a member's row. */
  yearlyDaysField(name: string): Locator {
    return this.teamSection().getByLabel(`Yearly days for ${name}`, { exact: true });
  }

  /** The unit next to every yearly-days field: "days / yr". */
  yearlyDaysUnits(): Locator {
    return this.teamSection().locator(".days-input");
  }

  /** The Team section's "Save changes"; it reads "Saving…" while busy. */
  saveTeamButton(): Locator {
    return this.teamSection().locator(".settings-actions .btn--primary");
  }

  /** The polite status next to the Team section's "Save changes": "Saved" after a save. */
  saveTeamStatus(): Locator {
    return this.teamSection().locator(".settings-actions [aria-live='polite']");
  }

  /** The banner after a section saves: "Team settings saved". */
  savedBanner(): Locator {
    return this.main.locator(".alert--success.banner");
  }

  /** The "Fix 1 thing to continue" summary the Team section shows for invalid fields. */
  teamSummary(): Locator {
    return this.teamSection().locator(".form-summary");
  }

  /** The inline error under the Team name field. */
  teamNameError(): Locator {
    return this.teamSection().locator("#team-name-err");
  }

  /** "We couldn't load your settings" */
  loadErrorTitle(): Locator {
    return this.teamSection().locator(".empty__title");
  }

  loadErrorText(): Locator {
    return this.teamSection().locator(".empty__text");
  }

  tryAgainButton(): Locator {
    return control(this.teamSection(), "Try again");
  }

  inviteButton(): Locator {
    return control(this.teamSection(), "Invite a member");
  }

  /** The read-only note a member sees instead of the controls (L2-009 AC3). */
  readOnlyNote(): Locator {
    return this.teamSection().locator(".alert");
  }

  /** "Only managers can change team settings." */
  readOnlyTitle(): Locator {
    return this.readOnlyNote().locator(".alert__title");
  }

  /** "Ask Maya Chen if something needs updating." */
  readOnlyBody(): Locator {
    return this.readOnlyNote().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  /** The "Edit working days" button on the row of `name` (a manager's, for a part-timer). */
  editWorkingDaysButton(name: string): Locator {
    return this.teamSection().getByRole("button", { name: `Edit working days for ${name}`, exact: true });
  }

  async openInviteDialog(): Promise<void> {
    await this.inviteButton().click();
  }

  // --- Allowances (docs/detailed-designs/allowances/allowance-defaults) ----------------------------

  allowancesSection(): Locator {
    return this.main.locator("section#allowances");
  }

  allowancesIntro(): Locator {
    return this.allowancesSection().locator("p").first();
  }

  daysPerYearField(): Locator {
    return this.allowancesSection().getByLabel("Days per year", { exact: true });
  }

  leaveYearStartField(): Locator {
    return this.allowancesSection().getByLabel("Leave year starts", { exact: true });
  }

  maxCarryOverField(): Locator {
    return this.allowancesSection().getByLabel("Max carry-over", { exact: true });
  }

  /** The allowances section's "Save changes"; it reads "Saving…" while busy. */
  saveAllowancesButton(): Locator {
    return this.allowancesSection().locator(".settings-actions .btn--primary");
  }

  /** The polite status next to "Save changes": "Saved" after a save. */
  saveAllowancesStatus(): Locator {
    return this.allowancesSection().locator(".settings-actions [aria-live='polite']");
  }

  /** The "Fix 1 thing to continue" summary of invalid allowance fields. */
  allowancesSummary(): Locator {
    return this.allowancesSection().locator(".form-summary");
  }

  /** The inline error under Days per year. */
  daysPerYearError(): Locator {
    return this.allowancesSection().locator("#allow-days-err");
  }

  /** The warning banner: "Two members have no allowance set". */
  noAllowanceBanner(): Locator {
    return this.main.locator(".alert--warning.banner");
  }

  // --- Coverage (docs/detailed-designs/teams/coverage-minimum) ------------------------------------

  coverageSection(): Locator {
    return this.main.locator("section#coverage");
  }

  /** "The fewest people who should be in on any working day. ..." */
  coverageIntro(): Locator {
    return this.coverageSection().locator("> p");
  }

  fewerPeopleButton(): Locator {
    return this.coverageSection().getByRole("button", { name: "Fewer people", exact: true });
  }

  morePeopleButton(): Locator {
    return this.coverageSection().getByRole("button", { name: "More people", exact: true });
  }

  /** The minimum the stepper shows, a number. */
  coverageValue(): Locator {
    return this.coverageSection().locator(".counter__value");
  }

  /** "of 7 people in": the team size. */
  coverageTeamSize(): Locator {
    return this.coverageSection().locator(".counter > span");
  }

  /** The coverage section's "Save changes"; it reads "Saving…" while busy. */
  saveCoverageButton(): Locator {
    return this.coverageSection().locator(".settings-actions .btn--primary");
  }

  /** The polite status next to "Save changes": "Saved" after a save. */
  saveCoverageStatus(): Locator {
    return this.coverageSection().locator(".settings-actions [aria-live='polite']");
  }

  /** Waits for the stepper to show the team's size, i.e. for the settings to have loaded. */
  async waitForCoverage(): Promise<void> {
    await this.coverageTeamSize().waitFor({ state: "visible", timeout: 10_000 });
  }

  // --- Notifications (docs/detailed-designs/teams/notification-settings) --------------------------

  notificationsSection(): Locator {
    return this.main.locator("section#notifications");
  }

  /** "Email only. Greenlit never sends daily digests." */
  notificationsIntro(): Locator {
    return this.notificationsSection().locator("> p");
  }

  /** The "New requests" switch; its accessible name is the label followed by the description, as in the mock. */
  newRequestsSwitch(): Locator {
    return this.notificationsSection().getByRole("switch", { name: /^New requests/ });
  }

  /** Flips the "New requests" switch with the keyboard: focus it, then Space. */
  async toggleNewRequestsWithKeyboard(): Promise<void> {
    await this.newRequestsSwitch().focus();
    await this.page.keyboard.press("Space");
  }

  /** The "Decisions" switch. */
  decisionsSwitch(): Locator {
    return this.notificationsSection().getByRole("switch", { name: /^Decisions/ });
  }

  /** The description under a switch, which the switch is described by. */
  switchDescription(label: "New requests" | "Decisions"): Locator {
    return this.notificationsSection().locator("label.switch").filter({ hasText: label }).locator("small");
  }

  /** The notifications section's "Save changes"; it reads "Saving…" while busy. */
  saveNotificationsButton(): Locator {
    return this.notificationsSection().locator(".settings-actions .btn--primary");
  }

  /** The polite status next to "Save changes": "Saved" after a save. */
  saveNotificationsStatus(): Locator {
    return this.notificationsSection().locator(".settings-actions [aria-live='polite']");
  }

  /** Waits for the switches to show the team's saved values, i.e. for the settings to have loaded. */
  async waitForNotifications(): Promise<void> {
    await this.newRequestsSwitch().waitFor({ state: "visible", timeout: 10_000 });
  }

  // --- School calendar (docs/detailed-designs/teams/school-calendar, L2-059 to L2-062) ------------

  schoolSection(): Locator {
    return this.main.locator("section#school");
  }

  /** The "School calendar" link of the settings section nav (in the page at every width). */
  schoolNavLink(): Locator {
    return this.main
      .getByRole("navigation", { name: "Settings sections", includeHidden: true })
      .getByRole("link", { name: "School calendar", exact: true, includeHidden: true });
  }

  /** "For a family: mark children, and add the days school is closed to their rows." */
  schoolIntro(): Locator {
    return this.schoolSection().locator("p").first();
  }

  /** The "Use the school calendar" switch. */
  schoolSwitch(): Locator {
    return this.schoolSection().getByRole("switch", { name: /^Use the school calendar/ });
  }

  /** The two lines under the switch. */
  schoolSwitchHelp(): Locator {
    return this.schoolSection().locator("label.switch small");
  }

  /** The section's "Save changes"; it reads "Saving…" while busy. */
  saveSchoolButton(): Locator {
    return this.schoolSection().locator(".settings-actions .btn--primary");
  }

  saveSchoolStatus(): Locator {
    return this.schoolSection().locator(".settings-actions [aria-live='polite']");
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
    return this.main.locator(".alert--info.banner");
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

  // ---- Your teams (L2-054, docs/detailed-designs/teams/switch-team) ----

  /** The "Your teams" section; a manager's only. */
  yourTeamsSection(): Locator {
    return this.main.locator("section#teams");
  }

  /** The "Your teams" link of the settings section nav (the nav shows from 1024px; it is in the page at every width). */
  yourTeamsNavLink(): Locator {
    return this.main
      .getByRole("navigation", { name: "Settings sections", includeHidden: true })
      .getByRole("link", { name: "Your teams", exact: true, includeHidden: true });
  }

  /** "The teams you manage. Greenlit opens your default team when you sign in." */
  yourTeamsIntro(): Locator {
    return this.yourTeamsSection().locator("p").first();
  }

  /** The list of teams, one row each (the region the visual spec compares). */
  teamList(): Locator {
    return this.yourTeamsSection().locator("ul.team-list");
  }

  /** The row under the list that holds "Add another team". */
  yourTeamsActions(): Locator {
    return this.yourTeamsSection().locator(".settings-actions");
  }

  /**
   * Moves the region onto whole pixels by relative positioning (nothing else moves), so the mock and the app, whose
   * content above it ends at different fractions of a pixel, rasterise it the same way. Applied alike to baseline and
   * verify.
   */
  async alignToPixelGrid(region: Locator): Promise<void> {
    await region.evaluate((el: HTMLElement) => {
      const box = el.getBoundingClientRect();
      const top = box.top + window.scrollY;
      const left = box.left + window.scrollX;
      el.style.position = "relative";
      el.style.top = `${Math.ceil(top) - top}px`;
      el.style.left = `${Math.ceil(left) - left}px`;
    });
  }

  /** The team names in the list, oldest first. */
  teamNames(): Locator {
    return this.yourTeamsSection().locator(".team-list__name");
  }

  /** The row of the team called `name`. */
  teamRow(name: string): Locator {
    return this.yourTeamsSection()
      .locator(".team-list__item")
      .filter({ has: this.page.locator(".team-list__name", { hasText: new RegExp(`^${name}$`) }) });
  }

  /** The marks on a team's row, as text: "Active", "Default". */
  teamMarks(name: string): Locator {
    return this.teamRow(name).locator(".team-list__marks .badge");
  }

  /** "Switch to this team" on a team's row (accessible name "Switch to {team}"). */
  switchToTeamButton(name: string): Locator {
    return this.yourTeamsSection().getByRole("button", { name: `Switch to ${name}`, exact: true });
  }

  /** "Make default" on a team's row (accessible name "Make {team} your default"). */
  makeDefaultButton(name: string): Locator {
    return this.yourTeamsSection().getByRole("button", { name: `Make ${name} your default`, exact: true });
  }

  /** Every action button of the section's rows. */
  teamActionButtons(): Locator {
    return this.yourTeamsSection().locator(".team-list__actions button");
  }

  /** "Add another team" */
  addTeamButton(): Locator {
    return control(this.yourTeamsSection(), "Add another team");
  }

  /** The skeleton while the teams load. */
  yourTeamsLoading(): Locator {
    return this.yourTeamsSection().locator(".skeleton");
  }

  /** "We couldn't load your teams" */
  yourTeamsErrorTitle(): Locator {
    return this.yourTeamsSection().locator(".alert__title");
  }

  yourTeamsTryAgain(): Locator {
    return control(this.yourTeamsSection(), "Try again");
  }

  /** Waits for "Your teams" to list the manager's teams. */
  async waitForTeams(): Promise<void> {
    await this.teamNames().first().waitFor();
  }
}
