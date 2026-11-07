import { Locator, Page } from "@playwright/test";

/**
 * The account menu behind the avatar in the top bar: on every signed-in screen in the app,
 * dialogs/user-menu/default.html in the mocks (docs/detailed-designs/identity-and-access/sign-out).
 * Part of the chrome, not a screen, so it has no `data-page`.
 */
export class AccountMenu {
  constructor(private readonly page: Page) {}

  /** The avatar button: "Account menu for Maya Chen", or "Account menu" while the name is not known. */
  avatar(): Locator {
    return this.page.locator("header.topbar").getByRole("button", { name: /^Account menu/ });
  }

  /** The open menu panel, named "Account". */
  menu(): Locator {
    return this.page.getByRole("menu", { name: "Account", exact: true });
  }

  /** The person's name, in bold. */
  name(): Locator {
    return this.menu().locator(".user-menu__who strong");
  }

  /** "Manager · maya@northwind.studio" */
  roleAndEmail(): Locator {
    return this.menu().locator(".user-menu__who span");
  }

  /** The menu items, in order. */
  items(): Locator {
    return this.menu().getByRole("menuitem");
  }

  item(name: string): Locator {
    return this.menu().getByRole("menuitem", { name, exact: true });
  }

  async open(): Promise<void> {
    await this.avatar().click();
  }
}
