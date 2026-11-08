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

test.describe("Switching from the header", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await resetTeams(request, jugglerFor(testInfo.project.name));
  });

  test("choosing another team switches, says so, and stays on the year (AC11, AC3)", async ({
    goto,
    pages,
    teamsApi,
  }, testInfo) => {
    await goto("year", { as: jugglerFor(testInfo.project.name) });
    await pages.year.waitForReady();
    await expect(pages.year.memberNames()).toContainText(["Kit Brown"]);
    const release = await teamsApi.holdSwitch();

    await pages.teamSwitcher.choose("Product team");

    await expect(pages.teamSwitcher.button()).toHaveAttribute("aria-busy", "true");
    release();
    await expect(pages.year.toast("Switched to Product team")).toBeVisible();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Product team");
    await pages.year.waitForReady();
    await expect(pages.year.memberNames()).toContainText(["Raj Mehta"]);
    await expect(pages.year.memberNames()).not.toContainText(["Kit Brown"]);
  });

  test("by keyboard from the calendar it switches and stays on the calendar (AC11)", async ({
    goto,
    page,
    pages,
  }, testInfo) => {
    await goto("calendar", { as: jugglerFor(testInfo.project.name) });
    await pages.calendar.waitForReady();
    await pages.teamSwitcher.button().focus();

    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(pages.calendar.toast("Switched to Product team")).toBeVisible();
    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).toContainText(["Raj Mehta"]);
    await expect(pages.calendar.memberNames()).not.toContainText(["Kit Brown"]);
  });

  test("by touch on Requests it switches and stays on Requests (AC11)", async ({ goto, pages }, testInfo) => {
    test.skip(!isPhone(testInfo), "touch on the phone viewport");
    await goto("requests", { as: jugglerFor(testInfo.project.name) });
    await pages.requests.waitForReady();

    await pages.teamSwitcher.button().tap();
    await pages.teamSwitcher.team("Product team").tap();

    await expect(pages.requests.toast("Switched to Product team")).toBeVisible();
    await pages.requests.waitForReady();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Product team");
  });

  test("a person page belongs to one team, so a switch from it opens the calendar (AC11)", async ({
    goto,
    pages,
  }, testInfo) => {
    const juggler = jugglerFor(testInfo.project.name);
    await goto("person", { as: juggler, person: "Kit Brown" });
    await pages.person.waitForReady();

    await pages.teamSwitcher.choose("Product team");

    await pages.calendar.waitForReady();
    await expect(pages.calendar.toast("Switched to Product team")).toBeVisible();
    await expect(pages.calendar.memberNames()).toContainText(["Raj Mehta"]);
  });

  test("choosing the active team only closes the menu (AC11)", async ({ goto, pages, teamsApi }, testInfo) => {
    await goto("calendar", { as: jugglerFor(testInfo.project.name) });

    await pages.teamSwitcher.choose("Design team");

    await expect(pages.teamSwitcher.menu()).toBeHidden();
    expect(teamsApi.switches()).toBe(0);
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Design team");
  });

  test("a failed switch says so and keeps the team (AC9)", async ({ goto, pages, teamsApi }, testInfo) => {
    await goto("calendar", { as: jugglerFor(testInfo.project.name) });
    await pages.calendar.waitForReady();
    await teamsApi.failSwitch();

    await pages.teamSwitcher.choose("Product team");

    const title = "We couldn’t switch teams";
    await expect(pages.calendar.toast(title)).toBeVisible();
    await expect(pages.calendar.toastText(title)).toHaveText(
      "You’re still on Design team. Check your connection and try again.",
    );
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Design team");
    await expect(pages.calendar.memberNames()).toContainText(["Kit Brown"]);
  });

  test("Add another team opens Set up another team, and Manage your teams opens Your teams (AC11)", async ({
    goto,
    pages,
  }, testInfo) => {
    await goto("calendar", { as: jugglerFor(testInfo.project.name) });

    await pages.teamSwitcher.open();
    await pages.teamSwitcher.item("Add another team").click();
    await pages.createTeam.waitForReady();
    await expect(pages.createTeam.heading()).toHaveText("Set up another team");

    await pages.createTeam.backToSettings().click();
    await pages.settings.waitForTeams();
    await pages.settings.openFromMainNav("Calendar");
    await pages.calendar.waitForReady();
    await pages.teamSwitcher.open();
    await pages.teamSwitcher.item("Manage your teams").click();
    await pages.settings.waitForTeams();
    await expect(pages.settings.yourTeamsSection()).toBeInViewport();
  });
});
