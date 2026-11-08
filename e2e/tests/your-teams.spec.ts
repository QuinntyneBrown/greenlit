// Acceptance Test
// Traces to: L2-054 (Manager with several teams)
// Description: Settings shows a manager the teams they manage in "Your teams", marks the active and the default
//              team in text and icon, and lets them switch, make a team the default and add another team.
// Data: each viewport's juggler (Hana, Iris, Jude) manages Design team (default) and Product team; every test puts
//       Design team back as the default and starts signed in on it. Maya (one team) and Ana (a member) are only read.

import { test, expect } from "../fixtures/gl-test.js";
import { forgetSignIn, founderFor, jugglerFor } from "../fixtures/session.js";
import { managedTeams, resetTeams } from "../fixtures/teams.js";

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

test.describe("Switching teams from Your teams", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const juggler = jugglerFor(testInfo.project.name);
    await resetTeams(request, juggler);
    await goto("settings", { as: juggler });
    await pages.settings.waitForTeams();
  });

  test("Switch to this team makes it active, says so, and every screen shows that team only (AC3)", async ({
    pages,
    teamsApi,
  }) => {
    await expect(pages.settings.teamNameField()).toHaveValue("Design team");
    const release = await teamsApi.holdSwitch();

    await pages.settings.switchToTeamButton("Product team").click();

    await expect(pages.settings.switchToTeamButton("Product team")).toHaveText("Switching…");
    await expect(pages.settings.makeDefaultButton("Product team")).toBeDisabled();
    release();
    await expect(pages.settings.toast("Switched to Product team")).toBeVisible();
    await expect(pages.settings.toastText("Switched to Product team")).toHaveText(
      "The calendar, year, requests and settings now show Product team.",
    );
    await expect(pages.settings.teamNameField()).toHaveValue("Product team");
    await expect(pages.settings.memberNames()).toContainText(["Raj Mehta"]);
    await expect(pages.settings.memberNames()).not.toContainText(["Kit Brown"]);
    await expect(pages.settings.teamMarks("Product team")).toHaveText(["Active"]);
    await expect(pages.settings.teamMarks("Design team")).toHaveText(["Default"]);

    await pages.settings.openFromMainNav("Calendar");
    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).toContainText(["Raj Mehta"]);
    await expect(pages.calendar.memberNames()).not.toContainText(["Kit Brown"]);
    await pages.calendar.openFromMainNav("Year");
    await pages.year.waitForReady();
    await expect(pages.year.memberNames()).toContainText(["Raj Mehta"]);
    await expect(pages.year.memberNames()).not.toContainText(["Kit Brown"]);
  });

  test("a failed switch says so, keeps the team, and Try again switches (AC9)", async ({ pages, teamsApi }) => {
    await teamsApi.failSwitch();

    await pages.settings.switchToTeamButton("Product team").click();

    const title = "We couldn’t switch teams";
    await expect(pages.settings.toast(title)).toBeVisible();
    await expect(pages.settings.toastText(title)).toHaveText(
      "You’re still on Design team. Check your connection and try again.",
    );
    await expect(pages.settings.teamNameField()).toHaveValue("Design team");
    await expect(pages.settings.teamMarks("Design team")).toHaveText(["Active", "Default"]);
    await expect(pages.settings.switchToTeamButton("Product team")).toBeEnabled();

    await teamsApi.recoverSwitch();
    await pages.settings.toastAction(title, "Try again").click();

    await expect(pages.settings.toast("Switched to Product team")).toBeVisible();
    await expect(pages.settings.teamNameField()).toHaveValue("Product team");
  });
});

test.describe("Making a team the default", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const juggler = jugglerFor(testInfo.project.name);
    await resetTeams(request, juggler);
    await goto("settings", { as: juggler });
    await pages.settings.waitForTeams();
  });

  test.afterEach(async ({ request }, testInfo) => {
    await resetTeams(request, jugglerFor(testInfo.project.name));
  });

  test("Make default moves the one Default mark, says so, keeps the active team, and sign-in opens it next (AC4)", async ({
    pages,
    request,
    teamsApi,
  }, testInfo) => {
    const release = await teamsApi.holdDefault();

    await pages.settings.makeDefaultButton("Product team").click();

    await expect(pages.settings.makeDefaultButton("Product team")).toHaveText("Saving…");
    await expect(pages.settings.switchToTeamButton("Product team")).toBeDisabled();
    release();
    await expect(pages.settings.toast("Product team is now your default")).toBeVisible();
    await expect(pages.settings.toastText("Product team is now your default")).toHaveText(
      "Greenlit opens it when you sign in.",
    );
    await expect(pages.settings.teamMarks("Product team")).toHaveText(["Default"]);
    await expect(pages.settings.teamMarks("Design team")).toHaveText(["Active"]);
    await expect(pages.settings.makeDefaultButton("Product team")).toHaveCount(0);
    await expect(pages.settings.makeDefaultButton("Design team")).toBeVisible();
    await expect(pages.settings.teamNameField()).toHaveValue("Design team");

    const juggler = jugglerFor(testInfo.project.name);
    forgetSignIn(juggler);
    const afterSignIn = await managedTeams(request, juggler);
    expect(afterSignIn.filter((t) => t.active).map((t) => t.name)).toEqual(["Product team"]);
    expect(afterSignIn.filter((t) => t.isDefault).map((t) => t.name)).toEqual(["Product team"]);
  });

  test("a failed default change says so, keeps the mark, and Try again makes it (AC9)", async ({ pages, teamsApi }) => {
    await teamsApi.failDefault();

    await pages.settings.makeDefaultButton("Product team").click();

    const title = "We couldn’t change your default";
    await expect(pages.settings.toast(title)).toBeVisible();
    await expect(pages.settings.toastText(title)).toHaveText(
      "Design team is still your default. Check your connection and try again.",
    );
    await expect(pages.settings.teamMarks("Design team")).toHaveText(["Active", "Default"]);
    await expect(pages.settings.makeDefaultButton("Product team")).toBeEnabled();

    await teamsApi.recoverDefault();
    await pages.settings.toastAction(title, "Try again").click();

    await expect(pages.settings.toast("Product team is now your default")).toBeVisible();
    await expect(pages.settings.teamMarks("Product team")).toHaveText(["Default"]);
  });
});

test.describe("Adding another team", () => {
  test("Add another team opens Set up another team, and the new team becomes active but not default (AC5)", async ({
    goto,
    pages,
    request,
  }, testInfo) => {
    const founder = founderFor(testInfo.project.name);
    await goto("settings", { as: founder });
    await pages.settings.waitForTeams();

    await pages.settings.addTeamButton().click();

    await pages.createTeam.waitForReady();
    await expect(pages.createTeam.heading()).toHaveText("Set up another team");
    await expect(pages.createTeam.lead()).toHaveText(
      "Name it, pick a time zone and add the people who’ll share the sheet. Your other teams stay as they are.",
    );
    await pages.createTeam.backToSettings().click();
    await pages.settings.waitForTeams();
    await expect(pages.settings.teamNames()).toHaveText(["Studio team"]);

    await pages.settings.addTeamButton().click();
    await pages.createTeam.waitForReady();
    await pages.createTeam.fill({ name: "Lab team", members: [{ name: "Ola Berg" }] });
    await pages.createTeam.submit().click();
    await expect(pages.createTeam.heading()).toHaveText("You’re all set");
    await pages.createTeam.openCalendar().click();

    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).toContainText(["Ola Berg"]);
    await pages.calendar.openFromMainNav("Settings");
    await pages.settings.waitForTeams();
    await expect(pages.settings.teamNames()).toHaveText(["Studio team", "Lab team"]);
    await expect(pages.settings.teamMarks("Lab team")).toHaveText(["Active"]);
    await expect(pages.settings.teamMarks("Studio team")).toHaveText(["Default"]);
    forgetSignIn(founder);
    const signedInAgain = await managedTeams(request, founder);
    expect(signedInAgain.filter((t) => t.active).map((t) => t.name)).toEqual(["Studio team"]);
  });
});
