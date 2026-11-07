// Acceptance Test
// Traces to: L2-009 (Team settings)
// Description: The manager edits the Team section of Settings (name, time zone, each member's role and yearly days)
//              and saves it on its own; a member sees the page read-only.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own with a teammate; every test puts the
//       Team section back as it found it, so the demo team and the other specs never see a change. The member
//       tests read the demo team as Ana and change nothing.

import { test, expect } from "../fixtures/gl-test.js";
import { PEOPLE, inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";
import { readTeamSection, resetTeamSection } from "../fixtures/team-settings.js";

const TEAM = "Holiday team";

test.describe("The Team section", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, TEAM);
    await ensureMember(request, manager, "Teammate Holiday");
    await resetTeamSection(request, manager, TEAM);
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
  });

  test.afterEach(async ({ request }, testInfo) => {
    await resetTeamSection(request, inviterFor(testInfo.project.name), TEAM);
  });

  test("shows the team name, time zone and a row per member with role and yearly days (L2-009 AC1)", async ({
    pages,
  }, testInfo) => {
    const settings = pages.settings;
    const manager = PEOPLE[inviterFor(testInfo.project.name)].name;

    await expect(settings.teamIntro()).toHaveText(
      "Everyone who appears on the calendar. Managers can approve requests and edit any row.",
    );
    await expect(settings.teamNameField()).toHaveValue(TEAM);
    await expect(settings.timeZoneField()).toHaveValue("Europe/London");
    await expect(settings.timeZoneField().locator("option")).toHaveText([
      "London (GMT+0 / BST)",
      "Dublin",
      "Paris, Berlin (CET)",
      "New York (ET)",
    ]);
    await expect(settings.roleField(manager)).toHaveValue("Manager");
    await expect(settings.roleField("Teammate Holiday")).toHaveValue("Member");
    await expect(settings.yearlyDaysField(manager)).toBeVisible();
    await expect(settings.yearlyDaysField("Teammate Holiday")).toBeVisible();
    const rows = await settings.memberNames().count();
    await expect(settings.yearlyDaysUnits()).toHaveCount(rows);
    for (const unit of await settings.yearlyDaysUnits().all()) await expect(unit).toHaveText(/^days \/ yr\s*$/);
    await expect(settings.inviteButton()).toBeVisible();
    await expect(settings.saveTeamButton()).toHaveText("Save changes");
  });

  test("saves the name and a member's yearly days for everyone, showing Saving… then Saved and a banner (L2-009 AC2, AC7)", async ({
    pages,
    request,
    teamSettingsApi,
  }, testInfo) => {
    const settings = pages.settings;
    const manager = inviterFor(testInfo.project.name);
    await settings.teamNameField().fill("Product team");
    await settings.yearlyDaysField("Teammate Holiday").fill("22");
    const release = await teamSettingsApi.holdTeam();

    await settings.saveTeamButton().click();

    await expect(settings.saveTeamButton()).toHaveText("Saving…");
    await expect(settings.saveTeamButton()).toBeDisabled();
    release();
    await expect(settings.saveTeamStatus()).toHaveText("Saved");
    await expect(settings.saveTeamButton()).toHaveText("Save changes");
    await expect(settings.savedBanner().locator(".alert__title")).toHaveText("Team settings saved");
    await expect(settings.savedBanner()).toContainText("Everyone sees the new settings straight away.");
    const saved = await readTeamSection(request, manager);
    expect(saved.name).toBe("Product team");
    expect(saved.members.find((m) => m.name === "Teammate Holiday")?.yearlyDays).toBe(22);
  });
});
