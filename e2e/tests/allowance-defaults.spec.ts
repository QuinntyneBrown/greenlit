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
});
