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

  test("Save changes with no edits says so and sends nothing, even after an edit is undone (L2-009 AC4)", async ({
    pages,
    teamSettingsApi,
  }) => {
    const settings = pages.settings;

    await settings.saveTeamButton().click();

    await expect(settings.toast("No changes to save")).toBeVisible();
    await expect(settings.toastText("No changes to save")).toHaveText("Everything already matches what you entered.");
    await settings.teamNameField().fill("Something else");
    await settings.teamNameField().fill(TEAM);
    await settings.saveTeamButton().click();
    await expect(settings.toasts()).toHaveCount(2);
    expect(teamSettingsApi.teamSaves()).toBe(0);
  });

  test("a failed save keeps the values as entered and Try again saves them (L2-009 AC5)", async ({
    pages,
    request,
    teamSettingsApi,
  }, testInfo) => {
    const settings = pages.settings;
    await teamSettingsApi.failTeam();
    await settings.teamNameField().fill("Product team");
    await settings.yearlyDaysField("Teammate Holiday").fill("22");

    await settings.saveTeamButton().click();

    await expect(settings.toast("We couldn’t save your changes")).toBeVisible();
    await expect(settings.toastText("We couldn’t save your changes")).toHaveText(
      "Nothing was changed. Check your connection and try again.",
    );
    await expect(settings.teamNameField()).toHaveValue("Product team");
    await expect(settings.yearlyDaysField("Teammate Holiday")).toHaveValue("22");
    await expect(settings.saveTeamButton()).toHaveText("Save changes");
    await expect(settings.saveTeamButton()).toBeEnabled();
    await expect(settings.savedBanner()).toHaveCount(0);
    expect((await readTeamSection(request, inviterFor(testInfo.project.name))).name).toBe(TEAM);

    await teamSettingsApi.recoverTeam();
    await settings.toastAction("We couldn’t save your changes", "Try again").click();

    await expect(settings.saveTeamStatus()).toHaveText("Saved");
    expect((await readTeamSection(request, inviterFor(testInfo.project.name))).name).toBe("Product team");
  });

  test("an empty team name is flagged and nothing is sent (mock pages/settings/invalid)", async ({
    pages,
    teamSettingsApi,
  }) => {
    const settings = pages.settings;
    await settings.teamNameField().fill("");

    await settings.saveTeamButton().click();

    await expect(settings.teamSummary()).toContainText("Fix 1 thing to continue");
    await expect(settings.teamSummary().getByRole("link", { name: "Give your team a name." })).toBeVisible();
    await expect(settings.teamNameField()).toHaveAttribute("aria-invalid", "true");
    await expect(settings.teamNameError()).toHaveText("Give your team a name.");
    expect(teamSettingsApi.teamSaves()).toBe(0);

    await settings.teamNameField().fill(TEAM);
    await expect(settings.teamSummary()).toHaveCount(0);
  });
});

test.describe("The Team section for a member", () => {
  test("is read-only, names the manager to ask and has no Save button (L2-009 AC3)", async ({ goto, pages }) => {
    const settings = pages.settings;
    await goto("settings", { as: "member" });
    await settings.waitForReady();

    await expect(settings.readOnlyTitle()).toHaveText("Only managers can change team settings.");
    await expect(settings.readOnlyBody()).toHaveText("Ask Maya Chen if something needs updating.");
    await expect(settings.teamNameField()).toHaveValue("Design team");
    await expect(settings.teamNameField()).toBeDisabled();
    await expect(settings.timeZoneField()).toBeDisabled();
    await expect(settings.roleField("Ana Ruiz")).toBeDisabled();
    await expect(settings.roleField("Maya Chen")).toHaveValue("Manager");
    await expect(settings.yearlyDaysField("Ana Ruiz")).toBeDisabled();
    await expect(settings.saveTeamButton()).toHaveCount(0);
    await expect(settings.inviteButton()).toHaveCount(0);
  });
});
