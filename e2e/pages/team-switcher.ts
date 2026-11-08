import { Locator, Page } from "@playwright/test";

/**
 * The team switcher in the top bar (L2-054 AC11): on every app screen of a manager of two or more teams in the app,
 * dialogs/team-switcher/*.html in the mocks (docs/detailed-designs/teams/switch-team). Part of the chrome, not a
 * screen, so it has no `data-page`.
 */
export class TeamSwitcher {
  constructor(private readonly page: Page) {}

  /** The button: "Switch team, current team {team}", showing the active team's name. */
  button(): Locator {
    return this.page.locator("header.topbar").getByRole("button", { name: /^Switch team, current team / });
  }

  /** The active team's name on the button. */
  buttonName(): Locator {
    return this.button().locator(".team-switch__name");
  }

  /** The open menu, named "Your teams". */
  menu(): Locator {
    return this.page.getByRole("menu", { name: "Your teams", exact: true });
  }

  /** The team items, oldest first. */
  teams(): Locator {
    return this.menu().getByRole("menuitemradio");
  }

  team(name: string): Locator {
    return this.menu().getByRole("menuitemradio", { name: new RegExp(`^${name}\\b`) });
  }

  /** The "Default" text on a team's item. */
  defaultMark(name: string): Locator {
    return this.team(name).locator(".menu__meta");
  }

  /** "Add another team" and "Manage your teams". */
  item(name: string): Locator {
    return this.menu().getByRole("menuitem", { name, exact: true });
  }

  async open(): Promise<void> {
    await this.button().click();
  }

  /** Opens the menu and chooses the team called `name`. */
  async choose(name: string): Promise<void> {
    await this.open();
    await this.team(name).click();
  }
}
