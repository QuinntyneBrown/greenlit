// Acceptance Test
// Traces to: L2-054 (Manager with several teams)
// Description: Settings shows a manager the teams they manage in "Your teams", marks the active and the default
//              team in text and icon, and lets them switch, make a team the default and add another team.
// Data: each viewport's juggler (Hana, Iris, Jude) manages Design team (default) and Product team; every test puts
//       Design team back as the default and starts signed in on it. Maya (one team) and Ana (a member) are only read.

import { test, expect } from "../fixtures/gl-test.js";
import { jugglerFor } from "../fixtures/session.js";
import { resetTeams } from "../fixtures/teams.js";

test.describe("Your teams", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await resetTeams(request, jugglerFor(testInfo.project.name));
  });

  test("lists each team the manager manages, oldest first, with the active and default teams marked (AC2)", async ({
    goto,
    pages,
  }, testInfo) => {
    await goto("settings", { as: jugglerFor(testInfo.project.name) });
    await pages.settings.waitForTeams();

    await expect(pages.settings.yourTeamsNavLink()).toHaveCount(1);
    await expect(pages.settings.yourTeamsSection().getByRole("heading", { level: 2 })).toHaveText("Your teams");
    await expect(pages.settings.yourTeamsIntro()).toHaveText(
      "The teams you manage. Greenlit opens your default team when you sign in.",
    );
    await expect(pages.settings.teamNames()).toHaveText(["Design team", "Product team"]);
    await expect(pages.settings.teamMarks("Design team")).toHaveText(["Active", "Default"]);
    await expect(pages.settings.teamMarks("Product team")).toHaveCount(0);
    await expect(pages.settings.teamMarks("Design team").locator("svg")).toHaveCount(2);
    await expect(pages.settings.switchToTeamButton("Product team")).toHaveText("Switch to this team");
    await expect(pages.settings.makeDefaultButton("Product team")).toHaveText("Make default");
    await expect(pages.settings.switchToTeamButton("Design team")).toHaveCount(0);
    await expect(pages.settings.makeDefaultButton("Design team")).toHaveCount(0);
    await expect(pages.settings.addTeamButton()).toBeVisible();
  });

  test("a manager of one team sees it as active and default with no switch or default action (AC6)", async ({
    goto,
    pages,
  }) => {
    await goto("settings", { as: "manager" });
    await pages.settings.waitForTeams();

    await expect(pages.settings.teamNames()).toHaveText(["Design team"]);
    await expect(pages.settings.teamMarks("Design team")).toHaveText(["Active", "Default"]);
    await expect(pages.settings.teamActionButtons()).toHaveCount(0);
    await expect(pages.settings.addTeamButton()).toBeVisible();
  });

  test("a member sees no Your teams section and no Your teams in the section nav (AC7)", async ({ goto, pages }) => {
    await goto("settings", { as: "member" });
    await pages.settings.waitForReady();

    await expect(pages.settings.teamSection()).toBeVisible();
    await expect(pages.settings.yourTeamsSection()).toHaveCount(0);
    await expect(pages.settings.yourTeamsNavLink()).toHaveCount(0);
  });

  test("shows a skeleton while the teams load (mock pages/settings/your-teams-loading)", async ({
    goto,
    pages,
    teamsApi,
  }, testInfo) => {
    const release = await teamsApi.holdMine();
    await goto("settings", { as: jugglerFor(testInfo.project.name) });
    await pages.settings.waitForReady();

    await expect(pages.settings.yourTeamsLoading().first()).toBeVisible();
    release();
    await pages.settings.waitForTeams();
    await expect(pages.settings.yourTeamsLoading()).toHaveCount(0);
  });

  test("teams that cannot be read say so, and Try again loads them (mock pages/settings/your-teams-error)", async ({
    goto,
    pages,
    teamsApi,
  }, testInfo) => {
    await teamsApi.failMine();
    await goto("settings", { as: jugglerFor(testInfo.project.name) });
    await expect(pages.settings.yourTeamsErrorTitle()).toHaveText("We couldn’t load your teams");
    await expect(pages.settings.yourTeamsSection()).toContainText("Something went wrong on our side. Nothing was changed.");

    await teamsApi.recoverMine();
    await pages.settings.yourTeamsTryAgain().click();

    await expect(pages.settings.teamNames()).toHaveText(["Design team", "Product team"]);
  });
});
