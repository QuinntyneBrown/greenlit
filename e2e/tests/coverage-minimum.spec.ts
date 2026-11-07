// Acceptance Test
// Traces to: L2-041 (Coverage minimum)
// Description: The manager sets the fewest people who should be in with a stepper in Settings and saves it.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own with a teammate; every test
//       starts with no minimum and puts it back, so the demo team and the other specs never see it.

import { test, expect } from "../fixtures/gl-test.js";
import { setCoverageMinimum } from "../fixtures/coverage.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";

test.describe("The coverage minimum", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Teammate Holiday");
    await setCoverageMinimum(request, manager, 0);
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    await pages.settings.waitForCoverage();
  });

  test.afterEach(async ({ request }, testInfo) => {
    await setCoverageMinimum(request, inviterFor(testInfo.project.name), 0);
  });

  test("Coverage explains the minimum and shows a stepper with the team size (L2-041 AC1)", async ({ pages }) => {
    const settings = pages.settings;
    const teamSize = await settings.memberNames().count();

    await expect(settings.coverageIntro()).toHaveText(
      "The fewest people who should be in on any working day. Days below this are flagged on the calendar’s “Out” row.",
    );
    await expect(settings.fewerPeopleButton()).toBeVisible();
    await expect(settings.morePeopleButton()).toBeVisible();
    await expect(settings.coverageValue()).toHaveText("0");
    await expect(settings.coverageTeamSize()).toHaveText(`of ${teamSize} people in`);
    await expect(settings.saveCoverageButton()).toBeDisabled();
  });

  test("the stepper changes the value by one and stays within 0 and the team size (L2-041 AC2)", async ({ pages }) => {
    const settings = pages.settings;
    const teamSize = await settings.memberNames().count();

    await expect(settings.fewerPeopleButton()).toBeDisabled();
    await settings.morePeopleButton().click();
    await expect(settings.coverageValue()).toHaveText("1");
    await settings.morePeopleButton().click();
    await expect(settings.coverageValue()).toHaveText("2");
    await settings.fewerPeopleButton().click();
    await expect(settings.coverageValue()).toHaveText("1");

    for (let value = 2; value <= teamSize; value++) {
      await settings.morePeopleButton().click();
      await expect(settings.coverageValue()).toHaveText(String(value));
    }
    await expect(settings.coverageValue()).toHaveText(String(teamSize));
    await expect(settings.morePeopleButton()).toBeDisabled();
  });

  test("Save changes saves the value, and Settings shows it next time (L2-041 AC2)", async ({ goto, pages, coverageApi }, testInfo) => {
    const settings = pages.settings;
    await settings.morePeopleButton().click();
    await settings.morePeopleButton().click();
    await expect(settings.saveCoverageButton()).toBeEnabled();

    await settings.saveCoverageButton().click();

    await expect(settings.saveCoverageStatus()).toHaveText("Saved");
    await expect(settings.saveCoverageButton()).toBeDisabled();
    expect(coverageApi.saves()).toBe(1);
    await goto("settings", { as: inviterFor(testInfo.project.name) });
    await settings.waitForReady();
    await settings.waitForCoverage();
    await expect(settings.coverageValue()).toHaveText("2");
  });

  test("stepping back to the saved value leaves nothing to save", async ({ pages }) => {
    const settings = pages.settings;
    await settings.morePeopleButton().click();
    await settings.fewerPeopleButton().click();

    await expect(settings.saveCoverageButton()).toBeDisabled();
  });

  test("saving shows Saving… and keeps the stepper still (busy)", async ({ pages, coverageApi }) => {
    const settings = pages.settings;
    const release = await coverageApi.holdSave();
    await settings.morePeopleButton().click();

    await settings.saveCoverageButton().click();

    await expect(settings.saveCoverageButton()).toHaveText("Saving…");
    await expect(settings.saveCoverageButton()).toBeDisabled();
    await expect(settings.morePeopleButton()).toBeDisabled();
    await expect(settings.fewerPeopleButton()).toBeDisabled();
    release();
    await expect(settings.saveCoverageStatus()).toHaveText("Saved");
    await expect(settings.morePeopleButton()).toBeEnabled();
  });

  test("a failed save keeps the value as entered and a toast offers Try again (failed)", async ({ pages, coverageApi }) => {
    const settings = pages.settings;
    await coverageApi.failSave();
    await settings.morePeopleButton().click();

    await settings.saveCoverageButton().click();

    await expect(settings.toast("We couldn’t save your changes")).toBeVisible();
    await expect(settings.toastText("We couldn’t save your changes")).toHaveText("Nothing was changed. Check your connection and try again.");
    await expect(settings.coverageValue()).toHaveText("1");
    await expect(settings.saveCoverageButton()).toBeEnabled();

    await coverageApi.recoverSave();
    await settings.toastAction("We couldn’t save your changes", "Try again").click();
    await expect(settings.saveCoverageStatus()).toHaveText("Saved");
  });
});
