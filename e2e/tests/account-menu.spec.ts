// Acceptance Test
// Traces to: L2-006 (User menu and sign out) AC1, AC2
// Description: The avatar in the top bar opens the account menu: it names the person and their role, lists the
//              account's destinations and Sign out, and works from the keyboard.
// Data: the demo seed. Maya Chen manages the team; Ana Ruiz is a member.

import { test, expect } from "../fixtures/gl-test.js";
import { PEOPLE } from "../fixtures/session.js";

test.describe("The account menu", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();
  });

  test("the avatar opens a menu that names the manager and lists the account's destinations (AC1)", async ({ pages }) => {
    const menu = pages.accountMenu;
    await expect(menu.avatar()).toHaveAccessibleName("Account menu for Maya Chen");
    await expect(menu.avatar()).toHaveAttribute("aria-haspopup", "menu");
    await expect(menu.avatar()).toHaveAttribute("aria-expanded", "false");
    await expect(menu.menu()).toBeHidden();

    await menu.open();

    await expect(menu.avatar()).toHaveAttribute("aria-expanded", "true");
    await expect(menu.menu()).toBeVisible();
    await expect(menu.name()).toHaveText("Maya Chen");
    await expect(menu.roleAndEmail()).toHaveText(`Manager · ${PEOPLE.manager.email}`);
    await expect(menu.items()).toHaveText(["My time off", "Account", "Brand guide", "Sign out"]);
  });

  test("a member is named as a Member (AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member" });
    await pages.calendar.waitForReady();

    await expect(pages.accountMenu.avatar()).toHaveAccessibleName("Account menu for Ana Ruiz");
    await pages.accountMenu.open();

    await expect(pages.accountMenu.name()).toHaveText("Ana Ruiz");
    await expect(pages.accountMenu.roleAndEmail()).toHaveText(`Member · ${PEOPLE.member.email}`);
  });

  test("Enter on the avatar opens the menu on its first item, and the arrow keys, Home and End move between items (AC2)", async ({
    page,
    pages,
  }) => {
    const menu = pages.accountMenu;
    await menu.avatar().focus();

    await page.keyboard.press("Enter");

    await expect(menu.menu()).toBeVisible();
    await expect(menu.item("My time off")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.item("Account")).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.item("Sign out")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.item("My time off")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(menu.item("Sign out")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(menu.item("My time off")).toBeFocused();
  });

  test("ArrowDown on the avatar also opens the menu (AC2)", async ({ page, pages }) => {
    await pages.accountMenu.avatar().focus();

    await page.keyboard.press("ArrowDown");

    await expect(pages.accountMenu.item("My time off")).toBeFocused();
  });

  test("Escape closes the menu and focus returns to the avatar (AC2)", async ({ page, pages }) => {
    const menu = pages.accountMenu;
    await menu.avatar().focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");

    await page.keyboard.press("Escape");

    await expect(menu.menu()).toBeHidden();
    await expect(menu.avatar()).toBeFocused();
    await expect(menu.avatar()).toHaveAttribute("aria-expanded", "false");
  });

  test("choosing outside the menu closes it", async ({ pages }) => {
    await pages.accountMenu.open();

    await pages.calendar.main.click({ position: { x: 4, y: 400 } });

    await expect(pages.accountMenu.menu()).toBeHidden();
  });

  test("when the account cannot be read the menu still opens and Sign out is still there", async ({ authApi, goto, pages }) => {
    await authApi.failAccount();
    await goto("calendar");
    await pages.calendar.waitForReady();

    await expect(pages.accountMenu.avatar()).toHaveAccessibleName("Account menu");
    await pages.accountMenu.open();

    await expect(pages.accountMenu.menu()).toBeVisible();
    await expect(pages.accountMenu.items()).toHaveText(["My time off", "Account", "Brand guide", "Sign out"]);
  });
});
