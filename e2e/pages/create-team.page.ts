import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

/**
 * The create-team page: `/create-team` in the app, pages/create-team/*.html in
 * the mocks (docs/detailed-designs/teams/create-team).
 */
export class CreateTeamPage extends BasePage {
  readonly slug: PageSlug = "create-team";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.heading();
  }

  /** The card's heading: "Set up your team", then "You’re all set". */
  heading(): Locator {
    return this.main.locator(".card h1");
  }

  lead(): Locator {
    return this.main.locator(".card .lead");
  }

  teamName(): Locator {
    return this.main.getByLabel("Team name", { exact: true });
  }

  timeZone(): Locator {
    return this.main.getByLabel("Time zone", { exact: true });
  }

  publicHolidays(): Locator {
    return this.main.getByLabel("Public holidays", { exact: true });
  }

  /** The help text under a field, found through the field's aria-describedby. */
  async helpOf(field: Locator): Promise<Locator> {
    const ids = ((await field.getAttribute("aria-describedby")) ?? "").split(" ");
    return this.main.locator(`[id="${ids.find((id) => id.endsWith("-help"))}"]`);
  }

  /** The visible labels of a select's options, in order. */
  async optionLabels(select: Locator): Promise<string[]> {
    return (await select.locator("option").allTextContents()).map((t) => t.trim());
  }

  /** The "Who is on the team?" group. */
  members(): Locator {
    return this.main.getByRole("group", {
      name: "Who is on the team?",
      exact: true,
    });
  }

  membersNote(): Locator {
    return this.members().locator("p");
  }

  memberName(n: number): Locator {
    return this.main.getByLabel(`Member ${n} name`, { exact: true });
  }

  memberEmail(n: number): Locator {
    return this.main.getByLabel(`Member ${n} email (optional)`, {
      exact: true,
    });
  }

  /** Every member-name field, in order. */
  memberNames(): Locator {
    return this.members().getByRole("textbox", { name: /^Member \d+ name$/ });
  }

  addMember(): Locator {
    return this.main.getByRole("button", {
      name: "Add another member",
      exact: true,
    });
  }

  submit(): Locator {
    return this.main.getByRole("button", { name: "Create team", exact: true });
  }

  /** The field error under a control, found through its aria-describedby. */
  async errorOf(field: Locator): Promise<Locator> {
    const ids = ((await field.getAttribute("aria-describedby")) ?? "").split(" ");
    return this.main.locator(`[id="${ids.find((id) => id.endsWith("-err"))}"]`);
  }

  summary(): Locator {
    return this.main.locator(".form-summary");
  }

  summaryTitle(): Locator {
    return this.summary().locator(".alert__title");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  /** The danger alert after a failed submit (not the summary). */
  failure(): Locator {
    return this.main.locator(".alert--danger:not(.form-summary)");
  }

  failureTitle(): Locator {
    return this.failure().locator(".alert__title");
  }

  failureText(): Locator {
    return this.failure().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  /** The success alert: "{team} is ready" and who was invited. */
  ready(): Locator {
    return this.main.locator(".alert--success");
  }

  readyTitle(): Locator {
    return this.ready().locator(".alert__title");
  }

  readyText(): Locator {
    return this.ready().locator(".alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  openCalendar(): Locator {
    return this.main.getByRole("link", {
      name: "Open the calendar",
      exact: true,
    });
  }

  /** Fills the team fields and one row per member, adding rows as needed. */
  async fill(team: {
    name: string;
    timeZone?: string;
    holidays?: string;
    members?: { name: string; email?: string }[];
  }): Promise<void> {
    await this.teamName().fill(team.name);
    if (team.timeZone) await this.timeZone().selectOption({ label: team.timeZone });
    if (team.holidays) await this.publicHolidays().selectOption({ label: team.holidays });
    for (const [i, member] of (team.members ?? []).entries()) {
      if ((await this.memberNames().count()) <= i) await this.addMember().click();
      await this.memberName(i + 1).fill(member.name);
      if (member.email) await this.memberEmail(i + 1).fill(member.email);
    }
  }
}
