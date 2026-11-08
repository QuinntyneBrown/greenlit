// Acceptance Test
// Traces to: L2-054 AC11 (header team switcher), L2-049 AC2 and AC6 (app shell)
// Description: A manager of two or more teams sees the active team's name in the header and switches from any
//              screen; nobody else sees the switcher.
// Data: each viewport's juggler (Hana, Iris, Jude) manages Design team (default) and Product team; every test puts
//       Design team back as the default and starts signed in on it. Maya (one team) and Ana (a member) are only read.

import { test, expect, isPhone } from "../fixtures/gl-test.js";
import { jugglerFor } from "../fixtures/session.js";
import { resetTeams } from "../fixtures/teams.js";

test.describe("The team switcher", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await resetTeams(request, jugglerFor(testInfo.project.name));
  });

  for (const screen of ["calendar", "year", "requests", "settings"] as const) {
    test(`shows the active team on the ${screen} screen (AC11)`, async ({ goto, pages }, testInfo) => {
      await goto(screen, { as: jugglerFor(testInfo.project.name) });

      await expect(pages.teamSwitcher.button()).toHaveAccessibleName("Switch team, current team Design team");
      await expect(pages.teamSwitcher.buttonName()).toHaveText("Design team");
      await expect(pages.accountMenu.avatar()).toBeVisible();
    });
  }

  test("opens a menu of the teams with the active one checked and the default one marked (AC11)", async ({
    goto,
    pages,
  }, testInfo) => {
    await goto("calendar", { as: jugglerFor(testInfo.project.name) });
    const switcher = pages.teamSwitcher;

    if (isPhone(testInfo)) await switcher.button().tap();
    else await switcher.open();

    await expect(switcher.menu()).toBeVisible();
    await expect(switcher.teams()).toHaveCount(2);
    await expect(switcher.team("Design team")).toHaveAttribute("aria-checked", "true");
    await expect(switcher.team("Product team")).toHaveAttribute("aria-checked", "false");
    await expect(switcher.defaultMark("Design team")).toHaveText("Default");
    await expect(switcher.defaultMark("Product team")).toHaveCount(0);
    await expect(switcher.item("Add another team")).toBeVisible();
    await expect(switcher.item("Manage your teams")).toBeVisible();
  });

  test("Enter opens it on the first item, the arrow keys move, and Escape closes it back to the button (AC11)", async ({
    goto,
    page,
    pages,
  }, testInfo) => {
    await goto("calendar", { as: jugglerFor(testInfo.project.name) });
    const switcher = pages.teamSwitcher;
    await switcher.button().focus();

    await page.keyboard.press("Enter");

    await expect(switcher.team("Design team")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(switcher.team("Product team")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(switcher.item("Add another team")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(switcher.menu()).toBeHidden();
    await expect(switcher.button()).toBeFocused();
    await expect(switcher.button()).toHaveAttribute("aria-expanded", "false");
  });

  test("on a phone the header shows the switcher, the navigation and the avatar without scrolling sideways (L2-049 AC6)", async ({
    goto,
    page,
    pages,
  }, testInfo) => {
    test.skip(!isPhone(testInfo), "phone width only");
    await goto("calendar", { as: jugglerFor(testInfo.project.name) });

    await expect(pages.teamSwitcher.button()).toBeInViewport();
    await expect(pages.accountMenu.avatar()).toBeInViewport();
    await expect(pages.calendar.mainNavLink("Settings")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("a manager of one team and a member see no switcher (AC11)", async ({ goto, pages }) => {
    await goto("calendar", { as: "manager" });
    await expect(pages.accountMenu.avatar()).toBeVisible();
    await expect(pages.teamSwitcher.button()).toHaveCount(0);

    await goto("calendar", { as: "member" });
    await expect(pages.accountMenu.avatar()).toBeVisible();
    await expect(pages.teamSwitcher.button()).toHaveCount(0);
  });
});
