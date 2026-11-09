// Acceptance Test
// Traces to: L2-054 AC1, AC3, AC4, AC10, AC11 (Manager with several teams, end to end)
// Description: A manager of two teams signs in through the sign-in page, switches from Settings and from the header,
//              reloads, signs out and in again, changes the default and signs in once more: the active team survives
//              a reload, and every sign-in opens the default team.
// Data: each viewport's juggler (Hana, Iris, Jude) manages Design team (default) and Product team; the test puts
//       Design team back as the default before and after.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { DEMO_PASSWORD, PEOPLE, jugglerFor } from "../fixtures/session.js";
import { resetTeams } from "../fixtures/teams.js";


test.skip(({ isMobile }) => isMobile, GRID_ONLY);
test.describe("Running several teams end to end", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await resetTeams(request, jugglerFor(testInfo.project.name));
  });

  test.afterEach(async ({ request }, testInfo) => {
    await resetTeams(request, jugglerFor(testInfo.project.name));
  });

  test("sign in, switch, reload, sign out and in, change the default, sign in again", async ({
    goto,
    page,
    pages,
  }, testInfo) => {
    const juggler = PEOPLE[jugglerFor(testInfo.project.name)];
    const signIn = async () => {
      await pages.signIn.email().fill(juggler.email);
      await pages.signIn.password().fill(DEMO_PASSWORD);
      await pages.signIn.submit().click();
      await pages.calendar.waitForReady();
    };
    const signOut = async () => {
      await pages.accountMenu.open();
      await pages.accountMenu.item("Sign out").click();
      await pages.signOutDialog.signOut().click();
      await pages.signIn.waitForReady();
    };

    // Sign-in opens the default team (AC1).
    await goto("signIn");
    await signIn();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Design team");
    await expect(pages.calendar.memberNames()).toContainText(["Kit Brown"]);

    // Switch from Settings (AC3), then reload: the active team survives (AC10).
    await pages.calendar.openFromMainNav("Settings");
    await pages.settings.waitForTeams();
    await pages.settings.switchToTeamButton("Product team").click();
    await expect(pages.settings.toast("Switched to Product team")).toBeVisible();
    await page.reload();
    await pages.settings.waitForTeams();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Product team");
    await expect(pages.settings.teamNameField()).toHaveValue("Product team");

    // Switch back from the header on the calendar (AC11), and reload again.
    await pages.settings.openFromMainNav("Calendar");
    await pages.calendar.waitForReady();
    await pages.teamSwitcher.choose("Design team");
    await expect(pages.calendar.toast("Switched to Design team")).toBeVisible();
    await pages.teamSwitcher.choose("Product team");
    await expect(pages.calendar.toast("Switched to Product team")).toBeVisible();
    await page.reload();
    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).toContainText(["Raj Mehta"]);

    // Signing out and in again opens the default team, not the last active one (AC10).
    await signOut();
    await signIn();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Design team");
    await expect(pages.calendar.memberNames()).toContainText(["Kit Brown"]);

    // Make Product team the default (AC4): the next sign-in opens it.
    await pages.calendar.openFromMainNav("Settings");
    await pages.settings.waitForTeams();
    await pages.settings.makeDefaultButton("Product team").click();
    await expect(pages.settings.toast("Product team is now your default")).toBeVisible();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Design team");
    await signOut();
    await signIn();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Product team");
    await expect(pages.calendar.memberNames()).toContainText(["Raj Mehta"]);
  });
});
