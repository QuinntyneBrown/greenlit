// Acceptance Test
// Traces to: L2-027 (Allowance defaults)
// Description: The manager sets the allowance defaults for new people in the Allowances section of Settings, and
//              is told when members have no allowance of their own.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own with a teammate; every test puts the
//       defaults and the yearly days back, so the demo team and the other specs never see a change.

import { test, expect } from "../fixtures/gl-test.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";
import {
  leaveWithoutAllowance,
  readAllowanceDefaults,
  resetAllowanceDefaults,
  resetTeamSection,
} from "../fixtures/team-settings.js";

const TEAM = "Holiday team";

test.describe("The Allowances section", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, TEAM);
    await ensureMember(request, manager, "Teammate Holiday");
    await resetAllowanceDefaults(request, manager);
    await leaveWithoutAllowance(request, manager, 0);
  });

  /** Opens Settings as this viewport's manager. */
  async function open(goto: (key: "settings", options: { as: ReturnType<typeof inviterFor> }) => Promise<void>, pages: { settings: { waitForReady(): Promise<void> } }, project: string) {
    await goto("settings", { as: inviterFor(project) });
    await pages.settings.waitForReady();
  }

  test.afterEach(async ({ request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await resetAllowanceDefaults(request, manager);
    await resetTeamSection(request, manager, TEAM);
  });

  test("shows the defaults for new people and waits for an edit to save (L2-027 AC1)", async ({ goto, pages }, testInfo) => {
    const settings = pages.settings;
    await goto("settings", { as: inviterFor(testInfo.project.name) });
    await settings.waitForReady();

    await expect(settings.allowancesIntro()).toHaveText(
      "Defaults for new people. You can override anyone's allowance on the Team list or their profile.",
    );
    await expect(settings.daysPerYearField()).toHaveValue("25");
    await expect(settings.leaveYearStartField().locator("option")).toHaveText([
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]);
    await expect(settings.leaveYearStartField().locator("option:checked")).toHaveText("January");
    await expect(settings.maxCarryOverField()).toHaveValue("5");
    await expect(settings.saveAllowancesButton()).toHaveText("Save changes");
    await expect(settings.saveAllowancesButton()).toBeDisabled();
  });

  test("saves the defaults for everyone, showing Saving… then Saved (L2-027 AC1)", async ({
    goto,
    pages,
    request,
    allowanceApi,
  }, testInfo) => {
    const settings = pages.settings;
    await open(goto, pages, testInfo.project.name);
    await settings.daysPerYearField().fill("30");
    await settings.leaveYearStartField().selectOption({ label: "April" });
    await settings.maxCarryOverField().fill("8");
    await expect(settings.saveAllowancesButton()).toBeEnabled();
    const release = await allowanceApi.hold();

    await settings.saveAllowancesButton().click();

    await expect(settings.saveAllowancesButton()).toHaveText("Saving…");
    await expect(settings.saveAllowancesButton()).toBeDisabled();
    release();
    await expect(settings.saveAllowancesStatus()).toHaveText("Saved");
    await expect(settings.saveAllowancesButton()).toBeDisabled();
    await expect(settings.savedBanner().locator(".alert__title")).toHaveText("Team settings saved");
    expect(await readAllowanceDefaults(request, inviterFor(testInfo.project.name))).toMatchObject({
      defaultYearlyDays: 30,
      leaveYearStartMonth: 4,
      maxCarryOver: 8,
    });
  });

  test("a negative Days per year is flagged and nothing is sent (L2-027 AC2)", async ({
    goto,
    pages,
    allowanceApi,
  }, testInfo) => {
    const settings = pages.settings;
    await open(goto, pages, testInfo.project.name);
    await settings.daysPerYearField().fill("-3");

    await settings.saveAllowancesButton().click();

    await expect(settings.allowancesSummary()).toContainText("Fix 1 thing to continue");
    await expect(
      settings.allowancesSummary().getByRole("link", { name: "Days per year must be 0 or more" }),
    ).toBeVisible();
    await expect(settings.daysPerYearField()).toHaveAttribute("aria-invalid", "true");
    await expect(settings.daysPerYearError()).toHaveText("Enter 0 or more days.");
    expect(allowanceApi.saves()).toBe(0);

    await settings.daysPerYearField().fill("0");
    await expect(settings.allowancesSummary()).toHaveCount(0);
  });

  test("a failed save keeps the values as entered and Try again saves them", async ({
    goto,
    pages,
    request,
    allowanceApi,
  }, testInfo) => {
    const settings = pages.settings;
    await open(goto, pages, testInfo.project.name);
    await allowanceApi.fail();
    await settings.daysPerYearField().fill("30");

    await settings.saveAllowancesButton().click();

    await expect(settings.toast("We couldn’t save your changes")).toBeVisible();
    await expect(settings.daysPerYearField()).toHaveValue("30");
    await expect(settings.saveAllowancesButton()).toBeEnabled();
    expect((await readAllowanceDefaults(request, inviterFor(testInfo.project.name))).defaultYearlyDays).toBe(25);

    await allowanceApi.recover();
    await settings.toastAction("We couldn’t save your changes", "Try again").click();

    await expect(settings.saveAllowancesStatus()).toHaveText("Saved");
    expect((await readAllowanceDefaults(request, inviterFor(testInfo.project.name))).defaultYearlyDays).toBe(30);
  });

  test("members without yearly days of their own are named, with the default they use (L2-027 AC4)", async ({
    goto,
    pages,
    request,
  }, testInfo) => {
    const settings = pages.settings;
    const manager = inviterFor(testInfo.project.name);
    await leaveWithoutAllowance(request, manager, 2);
    await open(goto, pages, testInfo.project.name);

    await expect(settings.noAllowanceBanner().locator(".alert__title")).toHaveText("Two members have no allowance set");
    await expect(settings.noAllowanceBanner()).toContainText("They’re using the default of 25 days until you change it.");
  });

  test("no banner when everyone has yearly days of their own (L2-027 AC4)", async ({ goto, pages }, testInfo) => {
    await open(goto, pages, testInfo.project.name);

    await expect(pages.settings.noAllowanceBanner()).toHaveCount(0);
  });
});
