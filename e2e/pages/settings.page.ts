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
}
